// @ts-check

import { expect } from "chai"
import { testModules } from "./modules.js"

Reflect.set(globalThis, "expect", expect)
Reflect.set(globalThis, "__webNativeTestResults", { done: false })

mocha.setup({ ui: "bdd" })

for (const testModule of testModules) {
  await import(testModule)
}

/** @type {{ title: string, fullTitle: string, message: string, stack?: string }[]} */
const failureDetails = []
const runner = mocha.run()

runner.on("fail", (test, error) => {
  failureDetails.push({
    title: test.title,
    fullTitle: test.fullTitle(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
})

runner.on("end", () => {
  Reflect.set(globalThis, "__webNativeTestResults", {
    done: true,
    passed: runner.failures === 0,
    tests: runner.stats?.tests ?? 0,
    passes: runner.stats?.passes ?? 0,
    failures: runner.stats?.failures ?? runner.failures,
    duration: runner.stats?.duration ?? 0,
    failureDetails,
  })
})
