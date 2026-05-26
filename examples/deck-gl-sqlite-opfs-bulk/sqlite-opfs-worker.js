const cdnRoot = "https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.53.0-build1/dist/"
const databaseName = "/web-native-deck-gl-ops.sqlite3"

let sqlite3
let poolUtil
let db

self.addEventListener("error", (event) => {
  postMessage({ type: "error", message: errorToString(event.error ?? event.message) })
})

self.addEventListener("unhandledrejection", (event) => {
  postMessage({ type: "error", message: errorToString(event.reason) })
})

postMessage({
  type: "started",
  detail: {
    hasOpfs: typeof navigator.storage?.getDirectory === "function",
    secureContext: globalThis.isSecureContext === true,
  },
})

self.onmessage = async (event) => {
  const message = event.data ?? {}

  try {
    if (message.type === "init") await initDatabase()
    if (message.type === "snapshot") postSnapshot()
    if (message.type === "import") importBulk(message)
    if (message.type === "export") exportBulk(message)
    if (message.type === "reset") resetSeedData()
    if (message.type === "save-site") saveSite(message)
    if (message.type === "save-movement") saveMovement(message)
    if (message.type === "delete-site") deleteSite(message)
    if (message.type === "delete-movement") deleteMovement(message)
  } catch (error) {
    postMessage({ type: "error", message: errorToString(error) })
  }
}

async function initDatabase() {
  assertOpfsAvailable()

  if (!sqlite3) {
    const sqlite3InitModule = (await import(`${cdnRoot}index.mjs`)).default
    sqlite3 = await sqlite3InitModule({ locateFile: (file) => `${cdnRoot}${file}` })
  }

  if (!poolUtil) {
    poolUtil = await sqlite3.installOpfsSAHPoolVfs({
      directory: "/web-native/deck-gl-opfs-pool",
      forceReinitIfPreviouslyFailed: true,
      initialCapacity: 10,
      name: "web-native-deck-gl-opfs",
    })
  }

  if (!db) {
    db = new poolUtil.OpfsSAHPoolDb(databaseName, "c")
    db.exec("pragma foreign_keys = on")
    createSchema()
    seedIfEmpty()
  }

  postMessage({
    type: "ready",
    detail: {
      capacity: poolUtil.getCapacity(),
      databaseName,
      fileCount: poolUtil.getFileCount(),
      sqliteVersion: sqlite3.version.libVersion,
      vfsName: poolUtil.vfsName,
    },
  })
  postSnapshot()
}

function assertOpfsAvailable() {
  if (globalThis.isSecureContext !== true) {
    throw new Error("SQLite OPFS requires a secure browser context. Open this demo from http://localhost, 127.0.0.1, or HTTPS.")
  }

  if (typeof navigator.storage?.getDirectory !== "function") {
    throw new Error("OPFS is not available in this worker context. Try Chromium/Safari/Firefox over http://localhost or HTTPS.")
  }
}

function createSchema() {
  db.exec(`
    create table if not exists sites (
      id text primary key,
      name text not null,
      kind text not null,
      longitude real not null,
      latitude real not null,
      capacity integer not null,
      status text not null,
      updated_at text not null default current_timestamp
    );

    create table if not exists movements (
      id text primary key,
      from_site text not null references sites(id) on delete cascade,
      to_site text not null references sites(id) on delete cascade,
      cargo text not null,
      priority integer not null,
      tons real not null,
      status text not null,
      updated_at text not null default current_timestamp
    );
  `)
}

function seedIfEmpty() {
  const siteCount = Number(db.selectValue("select count(*) from sites"))
  if (siteCount > 0) return

  importRows(seedData(), { replace: true })
}

function resetSeedData() {
  requireDb()
  importRows(seedData(), { replace: true })
  postMessage({ type: "imported", detail: { importedMovements: seedData().movements.length, importedSites: seedData().sites.length, mode: "seed" } })
  postSnapshot()
}

function importBulk(message) {
  requireDb()

  const text = String(message.text ?? "")
  if (!text.trim()) throw new Error("Upload file is empty.")

  const rows = parseBulkPayload(String(message.fileName ?? "upload"), text)
  importRows(rows, { replace: message.replace === true })
  postMessage({
    type: "imported",
    detail: {
      importedMovements: rows.movements.length,
      importedSites: rows.sites.length,
      mode: message.replace === true ? "replace" : "merge",
    },
  })
  postSnapshot()
}

function exportBulk(message) {
  requireDb()

  const snapshot = readSnapshot()
  const format = message.format === "csv" ? "csv" : "json"
  const table = message.table === "movements" ? "movements" : "sites"
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")

  if (format === "csv") {
    const fields = table === "movements" ? movementCsvFields : siteCsvFields
    const rows = table === "movements" ? snapshot.movements : snapshot.sites
    postMessage({
      type: "exported",
      detail: {
        filename: `deck-gl-opfs-${table}-${stamp}.csv`,
        mimeType: "text/csv;charset=utf-8",
        text: toCsv(rows, fields),
      },
    })
    return
  }

  postMessage({
    type: "exported",
    detail: {
      filename: `deck-gl-opfs-dump-${stamp}.json`,
      mimeType: "application/json;charset=utf-8",
      text: JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, ...snapshot }, null, 2),
    },
  })
}

function saveSite(message) {
  requireDb()

  const site = normalizeSite(message.site ?? {})
  upsertSite(site)
  postMessage({ type: "saved", detail: { id: site.id, kind: "site", label: site.name } })
  postSnapshot()
}

function saveMovement(message) {
  requireDb()

  const movement = normalizeMovement(message.movement ?? {})
  upsertMovement(movement)
  postMessage({ type: "saved", detail: { id: movement.id, kind: "movement", label: `${movement.fromSite} to ${movement.toSite}` } })
  postSnapshot()
}

function deleteSite(message) {
  requireDb()

  const id = requireString(message.id, "site.id")
  db.exec("delete from sites where id = ?", { bind: [id] })
  postMessage({ type: "deleted", detail: { id, kind: "site" } })
  postSnapshot()
}

function deleteMovement(message) {
  requireDb()

  const id = requireString(message.id, "movement.id")
  db.exec("delete from movements where id = ?", { bind: [id] })
  postMessage({ type: "deleted", detail: { id, kind: "movement" } })
  postSnapshot()
}

function importRows(rows, options) {
  db.exec("begin immediate")

  try {
    if (options.replace) {
      db.exec("delete from movements; delete from sites")
    }

    for (const site of rows.sites) upsertSite(normalizeSite(site))
    for (const movement of rows.movements) upsertMovement(normalizeMovement(movement))
    db.exec("commit")
  } catch (error) {
    db.exec("rollback")
    throw error
  }
}

function upsertSite(site) {
  db.exec(
    `
      insert into sites(id, name, kind, longitude, latitude, capacity, status, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, coalesce(?, current_timestamp))
      on conflict(id) do update set
        name = excluded.name,
        kind = excluded.kind,
        longitude = excluded.longitude,
        latitude = excluded.latitude,
        capacity = excluded.capacity,
        status = excluded.status,
        updated_at = excluded.updated_at
    `,
    {
      bind: [site.id, site.name, site.kind, site.longitude, site.latitude, site.capacity, site.status, site.updatedAt],
    },
  )
}

function upsertMovement(movement) {
  db.exec(
    `
      insert into movements(id, from_site, to_site, cargo, priority, tons, status, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, coalesce(?, current_timestamp))
      on conflict(id) do update set
        from_site = excluded.from_site,
        to_site = excluded.to_site,
        cargo = excluded.cargo,
        priority = excluded.priority,
        tons = excluded.tons,
        status = excluded.status,
        updated_at = excluded.updated_at
    `,
    {
      bind: [movement.id, movement.fromSite, movement.toSite, movement.cargo, movement.priority, movement.tons, movement.status, movement.updatedAt],
    },
  )
}

function postSnapshot() {
  requireDb()
  postMessage({ type: "snapshot", detail: readSnapshot() })
}

function readSnapshot() {
  const sites = db.selectObjects(`
    select id, name, kind, longitude, latitude, capacity, status, updated_at as updatedAt
    from sites
    order by kind, id
  `)

  const movements = db.selectObjects(`
    select id, from_site as fromSite, to_site as toSite, cargo, priority, tons, status, updated_at as updatedAt
    from movements
    order by priority desc, id
  `)

  return { movements, sites }
}

function parseBulkPayload(fileName, text) {
  const trimmed = text.trim()
  if (fileName.toLowerCase().endsWith(".csv") || looksLikeCsv(trimmed)) {
    const rows = parseCsv(trimmed)
    if (rows.some(isMovementLike)) return { movements: rows, sites: [] }
    return { movements: [], sites: rows }
  }

  const parsed = JSON.parse(trimmed)
  if (Array.isArray(parsed)) {
    if (parsed.some(isMovementLike)) return { movements: parsed, sites: [] }
    return { movements: [], sites: parsed }
  }

  if (!parsed || typeof parsed !== "object") throw new Error("JSON upload must be an object or array.")

  return {
    movements: Array.isArray(parsed.movements) ? parsed.movements : [],
    sites: Array.isArray(parsed.sites) ? parsed.sites : [],
  }
}

function normalizeSite(row) {
  const id = requireString(row.id, "site.id")
  const site = {
    capacity: requireNumber(row.capacity, `site ${id}.capacity`),
    id,
    kind: requireString(row.kind ?? "site", `site ${id}.kind`),
    latitude: requireNumber(row.latitude, `site ${id}.latitude`),
    longitude: requireNumber(row.longitude, `site ${id}.longitude`),
    name: requireString(row.name ?? id, `site ${id}.name`),
    status: requireString(row.status ?? "stable", `site ${id}.status`),
    updatedAt: optionalString(row.updatedAt ?? row.updated_at),
  }
  return site
}

function normalizeMovement(row) {
  const id = requireString(row.id, "movement.id")
  const movement = {
    cargo: requireString(row.cargo ?? "supplies", `movement ${id}.cargo`),
    fromSite: requireString(row.fromSite ?? row.from_site ?? row.source, `movement ${id}.fromSite`),
    id,
    priority: requireNumber(row.priority ?? 1, `movement ${id}.priority`),
    status: requireString(row.status ?? "scheduled", `movement ${id}.status`),
    toSite: requireString(row.toSite ?? row.to_site ?? row.target, `movement ${id}.toSite`),
    tons: requireNumber(row.tons ?? 0, `movement ${id}.tons`),
    updatedAt: optionalString(row.updatedAt ?? row.updated_at),
  }
  return movement
}

function parseCsv(text) {
  const rows = []
  let field = ""
  let row = []
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (quoted && char === '"' && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (!quoted && char === ",") {
      row.push(field)
      field = ""
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }

  row.push(field)
  rows.push(row)

  const [headers = [], ...records] = rows.filter((candidate) => candidate.some((value) => value.trim() !== ""))
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header.trim(), record[index]?.trim() ?? ""])))
}

function toCsv(rows, fields) {
  return [fields.join(","), ...rows.map((row) => fields.map((field) => escapeCsv(row[field])).join(","))].join("\n")
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function looksLikeCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ""
  return firstLine.includes(",") && !text.startsWith("{") && !text.startsWith("[")
}

function isMovementLike(row) {
  return Boolean(row && typeof row === "object" && ("fromSite" in row || "from_site" in row || "source" in row || "toSite" in row || "to_site" in row || "target" in row))
}

function requireString(value, label) {
  const text = String(value ?? "").trim()
  if (!text) throw new Error(`${label} is required.`)
  return text
}

function optionalString(value) {
  const text = String(value ?? "").trim()
  return text || undefined
}

function requireNumber(value, label) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`${label} must be numeric.`)
  return number
}

function requireDb() {
  if (!db) throw new Error("SQLite OPFS database is not open yet.")
}

function errorToString(error) {
  return error instanceof Error ? error.stack ?? error.message : String(error)
}

function seedData() {
  return {
    sites: [
      { id: "SEA", name: "Seattle Air Bridge", kind: "hub", longitude: -122.31, latitude: 47.61, capacity: 86, status: "stable" },
      { id: "BOI", name: "Boise Cache", kind: "depot", longitude: -116.2, latitude: 43.61, capacity: 54, status: "stable" },
      { id: "DEN", name: "Denver Staging", kind: "hub", longitude: -104.99, latitude: 39.74, capacity: 91, status: "stable" },
      { id: "MSP", name: "Twin Cities Warming", kind: "shelter", longitude: -93.26, latitude: 44.98, capacity: 63, status: "strained" },
      { id: "DFW", name: "Dallas Logistics", kind: "hub", longitude: -96.8, latitude: 32.78, capacity: 96, status: "stable" },
      { id: "ATL", name: "Atlanta Medical", kind: "clinic", longitude: -84.39, latitude: 33.75, capacity: 72, status: "stable" },
      { id: "MIA", name: "Miami Shelter", kind: "shelter", longitude: -80.19, latitude: 25.76, capacity: 46, status: "strained" },
      { id: "JFK", name: "New York Intake", kind: "clinic", longitude: -73.78, latitude: 40.64, capacity: 68, status: "stable" },
    ],
    movements: [
      { id: "SEA-DEN-001", fromSite: "SEA", toSite: "DEN", cargo: "generators", priority: 2, tons: 18, status: "en route" },
      { id: "BOI-MSP-001", fromSite: "BOI", toSite: "MSP", cargo: "blankets", priority: 3, tons: 14, status: "loading" },
      { id: "DEN-DFW-001", fromSite: "DEN", toSite: "DFW", cargo: "water", priority: 4, tons: 27, status: "en route" },
      { id: "DFW-ATL-001", fromSite: "DFW", toSite: "ATL", cargo: "medical kits", priority: 5, tons: 11, status: "critical" },
      { id: "ATL-MIA-001", fromSite: "ATL", toSite: "MIA", cargo: "field beds", priority: 4, tons: 19, status: "scheduled" },
      { id: "JFK-ATL-001", fromSite: "JFK", toSite: "ATL", cargo: "nurses", priority: 2, tons: 7, status: "scheduled" },
    ],
  }
}

const siteCsvFields = ["id", "name", "kind", "longitude", "latitude", "capacity", "status", "updatedAt"]
const movementCsvFields = ["id", "fromSite", "toSite", "cargo", "priority", "tons", "status", "updatedAt"]
