// @ts-check

import * as Evolu from "@evolu/common"
import "web-native/shadcn/define"

const ActivityId = Evolu.id("Activity")

const Schema = {
  activity: {
    id: ActivityId,
    title: Evolu.NonEmptyString100,
    tag: Evolu.NonEmptyString100,
    minutes: Evolu.PositiveInt,
    impact: Evolu.PositiveInt,
    happenedAt: Evolu.DateIso,
    note: Evolu.nullOr(Evolu.String1000),
    isPinned: Evolu.nullOr(Evolu.SqliteBoolean),
  },
}

const html = String.raw
const seedKey = "web-native:evolu.web:seeded"

/**
 * @typedef {Object} EvoluWorker
 * @property {(message: unknown) => void} postMessage
 * @property {(callback: (message: unknown) => void) => void} onMessage
 */

/**
 * @typedef {Object} ActivityRow
 * @property {string} id
 * @property {string} title
 * @property {string} tag
 * @property {number} minutes
 * @property {number} impact
 * @property {string} happenedAt
 * @property {string | null} note
 * @property {number | null} isPinned
 * @property {string} createdAt
 */

/**
 * @typedef {Object} TagSummary
 * @property {string} tag
 * @property {number} entries
 * @property {number} minutes
 * @property {number} impact
 */

/**
 * @typedef {Object} Summary
 * @property {number} averageImpact
 * @property {number} minutes
 * @property {TagSummary[]} tags
 */

/**
 * @typedef {Object} ActivityLab
 * @property {ActivityRow[]} rows
 * @property {string} filter
 * @property {Awaited<typeof evolu.appOwner> | null} owner
 * @property {(() => void) | null} syncUnuse
 * @property {string} syncUrl
 * @property {() => Promise<void>} init
 * @property {(event: SubmitEvent) => void} insert
 * @property {(event?: Pick<Event, "preventDefault">) => number} seed
 * @property {(event: Event) => void} setFilter
 * @property {(id: string, nextPinned: number) => void} togglePin
 * @property {(id: string) => void} archive
 * @property {(event: Event) => Promise<void>} exportDatabase
 * @property {(event: Event) => void} revealPhrase
 * @property {(event: SubmitEvent) => Promise<void>} restoreOwner
 * @property {(event: Event) => Promise<void>} resetOwner
 * @property {(event: Event) => Promise<void>} toggleSync
 * @property {(showPhrase?: boolean) => void} renderOwner
 * @property {() => void} render
 * @property {() => ActivityRow[]} filteredRows
 * @property {(error: unknown) => void} showError
 */

const elements = {
  activityBody: document.querySelector("#activity-body"),
  chart: document.querySelector("#tag-chart"),
  emptyState: document.querySelector("#empty-state"),
  errorOutput: document.querySelector("#error-output"),
  exportButton: document.querySelector("#export-button"),
  filter: document.querySelector("#filter"),
  form: document.querySelector("#activity-form"),
  impactAverage: document.querySelector("#impact-average"),
  minutesTotal: document.querySelector("#minutes-total"),
  ownerId: document.querySelector("#owner-id"),
  phrase: document.querySelector("#recovery-phrase"),
  phraseField: document.querySelector("#restore-phrase"),
  phraseStatus: document.querySelector("#phrase-status"),
  seedButton: document.querySelector("#seed-button"),
  sparkline: document.querySelector("#sparkline"),
  statusBadge: document.querySelector("#status-badge"),
  statusText: document.querySelector("#status-text"),
  syncButton: document.querySelector("#sync-button"),
  syncRelay: document.querySelector("#sync-relay"),
  tagOptions: document.querySelector("#tag-options"),
  totalCount: document.querySelector("#total-count"),
}

/** @param {() => Worker} createWebWorker @returns {EvoluWorker} */
const wrapWebWorker = (createWebWorker) => {
  const webWorker = createWebWorker()

  return {
    postMessage(message) {
      webWorker.postMessage(message)
    },
    onMessage(callback) {
      webWorker.onmessage = (event) => {
        callback(event.data)
      }
    },
  }
}

const createDbWorker = (name) =>
  wrapWebWorker(() => {
    return new Worker(new URL("./evolu.worker.js", import.meta.url), {
      name: `evolu-${name}`,
      type: "module",
    })
  })

const deps = {
  console: Evolu.createConsole(),
  createDbWorker,
  randomBytes: Evolu.createRandomBytes(),
  reloadApp: () => location.reload(),
  time: Evolu.createTime(),
}

const evolu = Evolu.createEvolu(deps)(Schema, {
  name: Evolu.SimpleName.orThrow("evoluweblab"),
  reloadUrl: location.pathname,
  transports: [],
})

const activityQuery = evolu.createQuery((db) =>
  db
    .selectFrom("activity")
    .selectAll()
    .where("isDeleted", "is not", Evolu.sqliteTrue)
    .orderBy("isPinned", "desc")
    .orderBy("createdAt", "desc"),
)

/** @type {ActivityLab} */
const app = {
  rows: [],
  filter: "all",
  owner: null,
  syncUnuse: null,
  syncUrl: "",

  async init() {
    setControlsEnabled(false)
    setStatus("loading", "Opening the encrypted SQLite database...")

    evolu.subscribeError(() => {
      const error = evolu.getError()
      if (!error) return
      this.showError(error)
      setStatus("error", "Evolu reported an operational error.")
    })

    evolu.subscribeQuery(activityQuery)(() => {
      this.rows = [...evolu.getQueryRows(activityQuery)]
      this.render()
    })

    this.rows = [...(await evolu.loadQuery(activityQuery))]
    this.owner = await evolu.appOwner

    const seedCount =
      this.rows.length === 0 && !localStorage.getItem(seedKey) ? this.seed() : 0

    this.renderOwner()
    this.render()
    setControlsEnabled(true)
    setStatus(
      "ready",
      seedCount > 0 ? `Queued ${seedCount} sample activities.` : "Local Evolu database ready.",
    )
    Reflect.set(globalThis, "__webNativeEvoluWebReady", true)
  },

  insert(event) {
    event.preventDefault()
    const form = /** @type {HTMLFormElement} */ (event.currentTarget)
    const data = new FormData(form)
    const title = String(data.get("title") ?? "").trim()
    const tag = String(data.get("tag") ?? "").trim()
    const minutes = Number(data.get("minutes"))
    const impact = Number(data.get("impact"))
    const note = String(data.get("note") ?? "").trim()

    const result = evolu.insert(
      "activity",
      {
        title,
        tag,
        minutes,
        impact,
        happenedAt: new Date().toISOString(),
        note: note.length > 0 ? note : null,
        isPinned: data.get("isPinned") === "on" ? Evolu.sqliteTrue : Evolu.sqliteFalse,
      },
      { onComplete: () => setStatus("ready", `Saved "${title}".`) },
    )

    if (!result.ok) {
      this.showError(result.error)
      setStatus("error", "Activity validation failed.")
      return
    }

    form.reset()
    const titleControl = form.elements.namedItem("title")
    if (titleControl instanceof HTMLElement) titleControl.focus()
  },

  seed(event) {
    event?.preventDefault()

    const samples = [
      ["Sketch sync UX", "design", 35, 4, "Mapped backup and restore states."],
      ["Read Evolu docs", "research", 25, 3, "Checked schema, owners, and relay notes."],
      ["Prototype worker imports", "engineering", 45, 5, "Validated the no-build CDN shape."],
      ["Triage edge cases", "engineering", 30, 4, "Looked at soft delete and pinned rows."],
      ["Write launch notes", "writing", 20, 2, "Drafted a terse changelog."],
    ]

    let inserted = 0
    for (const [title, tag, minutes, impact, note] of samples) {
      const result = evolu.insert("activity", {
        title,
        tag,
        minutes,
        impact,
        note,
        happenedAt: new Date(Date.now() - Number(minutes) * 60_000).toISOString(),
        isPinned: impact === 5 ? Evolu.sqliteTrue : Evolu.sqliteFalse,
      })

      if (!result.ok) {
        this.showError(result.error)
        continue
      }

      inserted += 1
    }

    if (inserted > 0) {
      localStorage.setItem(seedKey, "true")
      setStatus("ready", `Queued ${inserted} sample activities.`)
    }

    return inserted
  },

  setFilter(event) {
    const filter = /** @type {HTMLSelectElement} */ (event.currentTarget)
    this.filter = filter.value
    this.render()
  },

  togglePin(id, nextPinned) {
    const result = evolu.update(
      "activity",
      {
        id,
        isPinned: nextPinned ? Evolu.sqliteTrue : Evolu.sqliteFalse,
      },
      { onComplete: () => setStatus("ready", nextPinned ? "Pinned row." : "Unpinned row.") },
    )

    if (!result.ok) this.showError(result.error)
  },

  archive(id) {
    const result = evolu.update(
      "activity",
      { id, isDeleted: Evolu.sqliteTrue },
      { onComplete: () => setStatus("ready", "Soft-deleted row.") },
    )

    if (!result.ok) this.showError(result.error)
  },

  async exportDatabase(event) {
    event.preventDefault()
    const bytes = await evolu.exportDatabase()
    const blob = new Blob([bytes], { type: "application/x-sqlite3" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")

    anchor.href = url
    anchor.download = `evolu.web.lab-${new Date().toISOString().replaceAll(":", "-")}.sqlite`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    setStatus("ready", `Exported ${formatBytes(bytes.byteLength)} SQLite database.`)
  },

  revealPhrase(event) {
    event.preventDefault()
    this.renderOwner(true)
  },

  async restoreOwner(event) {
    event.preventDefault()
    const phraseField = /** @type {HTMLTextAreaElement | null} */ (elements.phraseField)
    const value = String(phraseField?.value ?? "").trim()
    const mnemonic = Evolu.Mnemonic.from(value)

    if (!mnemonic.ok) {
      this.showError(mnemonic.error)
      setText(elements.phraseStatus, "Recovery phrase validation failed.")
      return
    }

    setControlsEnabled(false)
    setText(elements.phraseStatus, "Restoring owner...")
    await evolu.restoreAppOwner(mnemonic.value, { reload: false })
    localStorage.removeItem(seedKey)
    location.reload()
  },

  async resetOwner(event) {
    event.preventDefault()
    if (!confirm("Reset this Evolu owner and delete the local database?")) return

    setControlsEnabled(false)
    await evolu.resetAppOwner({ reload: false })
    localStorage.removeItem(seedKey)
    location.reload()
  },

  async toggleSync(event) {
    event.preventDefault()

    if (this.syncUnuse) {
      this.syncUnuse()
      this.syncUnuse = null
      this.syncUrl = ""
      setStatus("ready", "Relay sync disconnected.")
      this.renderOwner()
      return
    }

    const owner = this.owner ?? (await evolu.appOwner)
    const syncRelay = /** @type {HTMLInputElement | null} */ (elements.syncRelay)
    const relayUrl = String(syncRelay?.value ?? "").trim()
    const transport = Evolu.createOwnerWebSocketTransport({
      ownerId: owner.id,
      url: relayUrl,
    })

    this.syncUnuse = evolu.useOwner({
      ...owner,
      transports: [transport],
    })
    this.syncUrl = transport.url
    setStatus("syncing", "Relay sync connected.")
    this.renderOwner()
  },

  render() {
    const rows = this.filteredRows()
    const stats = summarize(rows)
    const allTags = summarize(this.rows).tags

    setText(elements.totalCount, String(rows.length))
    setText(elements.minutesTotal, String(stats.minutes))
    setText(elements.impactAverage, stats.averageImpact.toFixed(1))

    renderTagOptions(allTags, this.filter)
    renderRows(rows)
    renderChart(stats.tags)
    renderSparkline(rows)

    elements.emptyState?.toggleAttribute("hidden", rows.length > 0)
  },

  renderOwner(showPhrase = false) {
    const owner = this.owner

    if (!owner) {
      setText(elements.ownerId, "pending")
      setText(elements.phrase, "pending")
      return
    }

    setText(elements.ownerId, compact(owner.id))
    setText(
      elements.phrase,
      showPhrase ? (owner.mnemonic ?? "External owner without mnemonic.") : "Hidden",
    )
    setText(
      elements.phraseStatus,
      this.syncUnuse ? `Syncing with ${this.syncUrl}` : "Local-only. Connect a relay when you want backup.",
    )

    if (elements.syncButton instanceof HTMLButtonElement) {
      elements.syncButton.textContent = this.syncUnuse ? "Disconnect" : "Connect"
    }
  },

  filteredRows() {
    if (this.filter === "all") return this.rows
    return this.rows.filter((row) => row.tag === this.filter)
  },

  showError(error) {
    const message = JSON.stringify(error, jsonReplacer, 2)
    setText(elements.errorOutput, message)
    console.error(error)
  },
}

globalThis.activityLab = app
app.init().catch((error) => {
  app.showError(error)
  setStatus("error", "Evolu failed to start. Check the console for details.")
})

function renderRows(rows) {
  if (!elements.activityBody) return

  elements.activityBody.innerHTML = rows
    .map((row) => {
      const id = JSON.stringify(row.id)
      const nextPinned = row.isPinned === Evolu.sqliteTrue ? 0 : 1
      return html`
        <tr>
          <td>
            <strong>${escapeHtml(row.title)}</strong>
            <span>${escapeHtml(row.note ?? "")}</span>
          </td>
          <td><shadcn-badge variant="secondary">${escapeHtml(row.tag)}</shadcn-badge></td>
          <td>${formatMinutes(row.minutes)}</td>
          <td>${renderImpact(row.impact)}</td>
          <td>${formatDate(row.happenedAt)}</td>
          <td class="row-actions">
            <button type="button" onclick="activityLab.togglePin(${id}, ${nextPinned})">
              ${row.isPinned === Evolu.sqliteTrue ? "Unpin" : "Pin"}
            </button>
            <button type="button" onclick="activityLab.archive(${id})">Archive</button>
          </td>
        </tr>
      `
    })
    .join("")
}

function renderTagOptions(tags, activeTag) {
  if (!elements.tagOptions || !elements.filter) return

  elements.tagOptions.innerHTML = tags
    .map((tag) => `<option value="${escapeHtml(tag.tag)}"></option>`)
    .join("")

  elements.filter.innerHTML = [
    `<option value="all">All tags</option>`,
    ...tags.map(
      (tag) =>
        `<option value="${escapeHtml(tag.tag)}"${tag.tag === activeTag ? " selected" : ""}>${escapeHtml(tag.tag)}</option>`,
    ),
  ].join("")
}

function renderChart(tags) {
  if (!elements.chart) return

  const maxMinutes = Math.max(1, ...tags.map((tag) => tag.minutes))
  elements.chart.innerHTML = tags
    .map((tag) => {
      const width = Math.max(6, Math.round((tag.minutes / maxMinutes) * 100))
      return html`
        <div class="tag-row">
          <span>${escapeHtml(tag.tag)}</span>
          <div class="bar-shell" aria-hidden="true">
            <div class="bar-fill" style="width: ${width}%"></div>
          </div>
          <strong>${formatMinutes(tag.minutes)}</strong>
        </div>
      `
    })
    .join("")
}

function renderSparkline(rows) {
  if (!elements.sparkline) return

  const days = Array.from({ length: 14 }, (_, index) => {
    const day = new Date()
    day.setDate(day.getDate() - (13 - index))
    const key = day.toISOString().slice(0, 10)
    return {
      key,
      label: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      minutes: 0,
    }
  })

  for (const row of rows) {
    const day = days.find((item) => item.key === row.happenedAt.slice(0, 10))
    if (day) day.minutes += row.minutes
  }

  const maxMinutes = Math.max(1, ...days.map((day) => day.minutes))
  elements.sparkline.innerHTML = days
    .map((day) => {
      const height = Math.max(0.2, day.minutes / maxMinutes)
      return html`
        <span
          title="${escapeHtml(day.label)}: ${formatMinutes(day.minutes)}"
          style="--height: ${height}"
        ></span>
      `
    })
    .join("")
}

function summarize(rows) {
  const tagsByName = new Map()
  let minutes = 0
  let impact = 0

  for (const row of rows) {
    minutes += row.minutes
    impact += row.impact

    const tag = tagsByName.get(row.tag) ?? {
      tag: row.tag,
      entries: 0,
      minutes: 0,
      impact: 0,
    }

    tag.entries += 1
    tag.minutes += row.minutes
    tag.impact += row.impact
    tagsByName.set(row.tag, tag)
  }

  return {
    averageImpact: rows.length === 0 ? 0 : impact / rows.length,
    minutes,
    tags: [...tagsByName.values()].sort((a, b) => b.minutes - a.minutes),
  }
}

function renderImpact(value) {
  return html`<span class="impact" aria-label="Impact ${value} of 5">${"I".repeat(value)}</span>`
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })
}

function formatMinutes(value) {
  if (value < 60) return `${value}m`
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function compact(value) {
  return `${String(value).slice(0, 10)}...${String(value).slice(-6)}`
}

function setControlsEnabled(enabled) {
  for (const element of [
    elements.exportButton,
    elements.seedButton,
    elements.syncButton,
    elements.form,
  ]) {
    if (element instanceof HTMLFormElement) {
      for (const control of element.elements) {
        if ("disabled" in control) control.disabled = !enabled
      }
    } else if (element && "disabled" in element) {
      element.disabled = !enabled
    }
  }
}

function setStatus(kind, message) {
  if (elements.statusBadge) {
    elements.statusBadge.setAttribute(
      "variant",
      kind === "error" ? "destructive" : kind === "ready" ? "default" : "secondary",
    )
    elements.statusBadge.textContent =
      kind === "error" ? "Error" : kind === "syncing" ? "Sync" : kind === "ready" ? "Ready" : "Loading"
  }
  setText(elements.statusText, message)
}

function setText(element, text) {
  if (element) element.textContent = text
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function jsonReplacer(_key, value) {
  if (value instanceof Uint8Array) return `Uint8Array(${value.byteLength})`
  if (value instanceof Error) return value.stack ?? value.message
  return value
}
