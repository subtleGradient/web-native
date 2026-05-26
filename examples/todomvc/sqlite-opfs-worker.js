const cdnRoot =
  "https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.53.0-build1/dist/"
const databaseName = "/web-native-todomvc.sqlite3"

let sqlite3
let poolUtil
let db
let lastQuery =
  "select id, title, priority, completed, created_at from todos order by created_at desc;"

self.addEventListener("error", (event) => {
  postMessage({
    type: "error",
    message: errorToString(event.error ?? event.message),
  })
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
    if (message.type === "add") addTodo(message.todo ?? {})
    if (message.type === "toggle") toggleTodo(message.id)
    if (message.type === "toggle-all") toggleAll(Boolean(message.completed))
    if (message.type === "remove") removeTodo(message.id)
    if (message.type === "clear-completed") clearCompleted()
    if (message.type === "reset") resetSeedData()
    if (message.type === "query") runQuery(message.sql)
    if (message.type === "export-json") exportJson()
  } catch (error) {
    postMessage({ type: "error", message: errorToString(error) })
  }
}

async function initDatabase() {
  assertOpfsAvailable()

  if (!sqlite3) {
    const sqlite3InitModule = (await import(`${cdnRoot}index.mjs`)).default
    sqlite3 = await sqlite3InitModule({
      locateFile: (file) => `${cdnRoot}${file}`,
    })
  }

  if (!poolUtil) {
    poolUtil = await sqlite3.installOpfsSAHPoolVfs({
      directory: "/web-native/todomvc-opfs-pool",
      forceReinitIfPreviouslyFailed: true,
      initialCapacity: 8,
      name: "web-native-todomvc-opfs",
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
  runQuery(lastQuery, { silent: true })
  postSnapshot()
}

function assertOpfsAvailable() {
  if (globalThis.isSecureContext !== true) {
    throw new Error(
      "SQLite OPFS requires a secure browser context. Open this demo from http://localhost, 127.0.0.1, or HTTPS.",
    )
  }

  if (typeof navigator.storage?.getDirectory !== "function") {
    throw new Error(
      "OPFS is not available in this worker context. Try Chromium/Safari/Firefox over http://localhost or HTTPS.",
    )
  }
}

function createSchema() {
  db.exec(`
    create table if not exists todos (
      id text primary key,
      title text not null,
      notes text not null default '',
      priority text not null default 'normal'
        check (priority in ('low', 'normal', 'high')),
      completed integer not null default 0 check (completed in (0, 1)),
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp
    );

    create index if not exists todos_completed_created_idx
      on todos(completed, created_at desc);
  `)
}

function seedIfEmpty() {
  const count = Number(db.selectValue("select count(*) from todos"))
  if (count > 0) return

  const now = new Date()
  const rows = [
    {
      title: "Ship a standalone TodoMVC example",
      notes: "Plain custom elements, no framework, persisted in SQLite OPFS.",
      priority: "high",
      completed: 0,
    },
    {
      title: "Exercise every shadcn web component",
      notes: "Inputs, fields, tabs, table, progress, radios, toggles, avatars, and status UI.",
      priority: "normal",
      completed: 0,
    },
    {
      title: "Keep event ownership in the markup",
      notes: "Forms and command wrappers call the TodoMvc domain object directly.",
      priority: "low",
      completed: 1,
    },
  ]

  db.exec("begin immediate")
  try {
    for (const [index, row] of rows.entries()) {
      db.exec(
        `
          insert into todos(id, title, notes, priority, completed, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?)
        `,
        {
          bind: [
            crypto.randomUUID(),
            row.title,
            row.notes,
            row.priority,
            row.completed,
            timestamp(new Date(now.getTime() - index * 60000)),
            timestamp(new Date(now.getTime() - index * 60000)),
          ],
        },
      )
    }
    db.exec("commit")
  } catch (error) {
    db.exec("rollback")
    throw error
  }
}

function addTodo(todo) {
  requireDb()

  const title = requireString(todo.title, "title").trim()
  if (!title) throw new Error("Todo title is required.")

  const notes = String(todo.notes ?? "").trim()
  const priority = normalizePriority(todo.priority)
  const completed = todo.completed ? 1 : 0
  const now = timestamp(new Date())

  db.exec(
    `
      insert into todos(id, title, notes, priority, completed, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `,
    {
      bind: [crypto.randomUUID(), title, notes, priority, completed, now, now],
    },
  )

  postMessage({ type: "saved", detail: { label: title } })
  postSnapshot()
}

function toggleTodo(id) {
  requireDb()

  db.exec(
    `
      update todos
      set completed = case completed when 1 then 0 else 1 end,
          updated_at = current_timestamp
      where id = ?
    `,
    { bind: [requireString(id, "id")] },
  )

  postSnapshot()
}

function toggleAll(completed) {
  requireDb()

  db.exec(
    `
      update todos
      set completed = ?,
          updated_at = current_timestamp
    `,
    { bind: [completed ? 1 : 0] },
  )

  postSnapshot()
}

function removeTodo(id) {
  requireDb()

  db.exec("delete from todos where id = ?", { bind: [requireString(id, "id")] })
  postMessage({ type: "deleted", detail: { id } })
  postSnapshot()
}

function clearCompleted() {
  requireDb()

  const count = Number(db.selectValue("select count(*) from todos where completed = 1"))
  db.exec("delete from todos where completed = 1")
  postMessage({ type: "cleared", detail: { count } })
  postSnapshot()
}

function resetSeedData() {
  requireDb()

  db.exec("delete from todos")
  seedIfEmpty()
  postMessage({ type: "reset" })
  postSnapshot()
}

function postSnapshot() {
  requireDb()

  const todos = db.selectObjects(`
    select
      id,
      title,
      notes,
      priority,
      completed,
      created_at as createdAt,
      updated_at as updatedAt
    from todos
    order by
      case priority when 'high' then 0 when 'normal' then 1 else 2 end,
      completed asc,
      created_at desc
  `)

  const stats =
    db.selectObjects(`
      select
        count(*) as total,
        coalesce(sum(completed = 0), 0) as active,
        coalesce(sum(completed = 1), 0) as completed,
        coalesce(sum(priority = 'high'), 0) as highPriority
      from todos
    `)[0] ?? {}

  postMessage({
    type: "snapshot",
    detail: {
      todos: todos.map(normalizeRow),
      stats: {
        total: Number(stats.total ?? 0),
        active: Number(stats.active ?? 0),
        completed: Number(stats.completed ?? 0),
        highPriority: Number(stats.highPriority ?? 0),
      },
    },
  })
}

function runQuery(sql, options = {}) {
  requireDb()

  const query = String(sql ?? "").trim()
  if (!isReadOnlyQuery(query)) {
    throw new Error("The SQL console accepts read-only SELECT, WITH, and safe PRAGMA statements.")
  }

  lastQuery = query
  const rows = db.selectObjects(query)

  if (!options.silent) {
    postMessage({
      type: "query-result",
      detail: { sql: query, rows: rows.map(normalizeQueryRow) },
    })
  } else {
    postMessage({
      type: "query-result",
      detail: { sql: query, rows: rows.map(normalizeQueryRow) },
    })
  }
}

function exportJson() {
  requireDb()

  const rows = db.selectObjects(`
    select id, title, notes, priority, completed, created_at as createdAt, updated_at as updatedAt
    from todos
    order by created_at desc
  `)

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  postMessage({
    type: "exported",
    detail: {
      filename: `todomvc-sqlite-${stamp}.json`,
      mimeType: "application/json;charset=utf-8",
      text: JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          databaseName,
          todos: rows.map(normalizeRow),
        },
        null,
        2,
      ),
    },
  })
}

function isReadOnlyQuery(sql) {
  const normalized = sql.replace(/--.*$/gm, "").trim().toLowerCase()
  if (!normalized) return false
  if (normalized.includes(";") && normalized.replace(/;+\s*$/, "").includes(";")) return false
  if (normalized.startsWith("select ")) return true
  if (normalized.startsWith("with ")) return true
  return (
    normalized === "pragma table_info(todos)" ||
    normalized === "pragma index_list(todos)" ||
    normalized === "pragma database_list"
  )
}

function normalizeRow(row) {
  return {
    id: String(row.id),
    title: String(row.title),
    notes: String(row.notes ?? ""),
    priority: normalizePriority(row.priority),
    completed: Number(row.completed) === 1,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }
}

function normalizeQueryRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "bigint" ? value.toString() : value,
    ]),
  )
}

function normalizePriority(priority) {
  const value = String(priority ?? "normal").toLowerCase()
  if (value === "low" || value === "normal" || value === "high") return value
  return "normal"
}

function timestamp(date) {
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "")
}

function requireDb() {
  if (!db) throw new Error("SQLite OPFS database is not open yet.")
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`)
  }

  return value
}

function errorToString(error) {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}
