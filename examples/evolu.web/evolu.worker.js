// @ts-check

import {
  bytesToHex,
  createConsole,
  createPreparedStatementsCache,
  createRandom,
  createRandomBytes,
  createTime,
  createWebSocket,
} from "https://cdn.jsdelivr.net/npm/@evolu/common@7.4.1/+esm"
import { createDbWorkerForPlatform } from "https://cdn.jsdelivr.net/npm/@evolu/common@7.4.1/local-first/+esm"

const sql = String.raw
const sqliteWasmUrl =
  "https://cdn.jsdelivr.net/npm/@evolu/sqlite-wasm@2.2.4/sqlite-wasm/jswasm/sqlite3.wasm"

Reflect.set(globalThis, "sqlite3ApiConfig", {
  locateFile(path) {
    return path.endsWith(".wasm") ? sqliteWasmUrl : path
  },
  warn(arg) {
    if (
      typeof arg === "string" &&
      arg.startsWith("Ignoring inability to install OPFS sqlite3_vfs")
    ) {
      return
    }

    console.warn(arg)
  },
})

const sqlite3Promise = import(
  "https://cdn.jsdelivr.net/npm/@evolu/sqlite-wasm@2.2.4/index.mjs"
).then((module) => module.default())

/**
 * @typedef {Object} EvoluWorker
 * @property {(message: unknown) => void} postMessage
 * @property {(callback: (message: unknown) => void) => void} onMessage
 */

/** @param {EvoluWorker} worker */
const wrapWebWorkerSelf = (worker) => {
  worker.onMessage((message) => {
    postMessage(message)
  })

  self.onmessage = (event) => {
    worker.postMessage(event.data)
  }
}

/**
 * @param {string} name
 * @param {{ memory?: boolean, encryptionKey?: Uint8Array } | undefined} options
 */
const createWasmSqliteDriver = async (name, options) => {
  const sqlite3 = await sqlite3Promise
  sqlite3.capi.sqlite3mc_vfs_create("opfs", 1)

  let db
  if (options?.memory) {
    db = new sqlite3.oo1.DB(":memory:")
  } else if (options?.encryptionKey) {
    const pool = await sqlite3.installOpfsSAHPoolVfs({ directory: `.${name}` })
    db = new pool.OpfsSAHPoolDb("file:evolu1.db?vfs=multipleciphers-opfs-sahpool")
    db.exec(sql`
      PRAGMA cipher = 'sqlcipher';
      PRAGMA legacy = 4;
      PRAGMA key = "x'${bytesToHex(options.encryptionKey)}'";
    `)
  } else {
    const pool = await sqlite3.installOpfsSAHPoolVfs({ name })
    db = new pool.OpfsSAHPoolDb("file:evolu1.db")
  }

  let isDisposed = false
  const cache = createPreparedStatementsCache(
    (query) => db.prepare(query),
    (statement) => {
      statement.finalize()
    },
  )

  return {
    exec(query, isMutation) {
      const prepared = cache.get(query)

      if (prepared) {
        prepared.bind(query.parameters)

        if (isMutation) {
          prepared.stepReset()
          return { changes: db.changes(), rows: [] }
        }

        const rows = []
        while (prepared.step()) rows.push(prepared.get({}))
        prepared.reset()
        return { changes: 0, rows }
      }

      const rows = db.exec(query.sql, {
        bind: query.parameters,
        returnValue: "resultRows",
        rowMode: "object",
      })

      return { changes: db.changes(), rows }
    },
    export: () => sqlite3.capi.sqlite3_js_db_export(db),
    [Symbol.dispose]() {
      if (isDisposed) return
      isDisposed = true
      cache[Symbol.dispose]()
      db.close()
    },
  }
}

const dbWorker = createDbWorkerForPlatform({
  console: createConsole(),
  createSqliteDriver: createWasmSqliteDriver,
  createWebSocket,
  random: createRandom(),
  randomBytes: createRandomBytes(),
  time: createTime(),
})

wrapWebWorkerSelf(dbWorker)
