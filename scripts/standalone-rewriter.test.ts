import { describe, expect, it } from "bun:test"
import {
  formatGithubTarballUrl,
  rewriteChatWebappPackageJson,
  rewriteBrokerRunnerInstructions,
} from "./standalone-rewriter.ts"

const repo = { owner: "subtleGradient", repo: "web-native" }
const tarballUrl = formatGithubTarballUrl(repo, "abc123")

describe("standalone rewriter", () => {
  it("rewrites chat webapp dev scripts to the GitHub chat runner bin", () => {
    const output = rewriteChatWebappPackageJson(
      `${JSON.stringify({
        name: "example-chat",
        private: true,
        type: "module",
        scripts: { dev: "bun --hot chat-runner.ts index.html" },
      }, null, 2)}\n`,
      { mode: "cdn", tarballUrl },
    )

    expect(JSON.parse(output).scripts.dev).toBe(
      `bunx --bun -p ${tarballUrl} web-native-ai-chat index.html`,
    )
  })

  it("preserves existing chat runner launch paths", () => {
    const output = rewriteChatWebappPackageJson(
      `${JSON.stringify({
        scripts: {
          dev: "bunx --bun -p https://github.com/subtleGradient/web-native/archive/old.tar.gz web-native-ai-chat ./nested.html",
        },
      }, null, 2)}\n`,
      { mode: "cdn", tarballUrl },
    )

    expect(JSON.parse(output).scripts.dev).toBe(
      `bunx --bun -p ${tarballUrl} web-native-ai-chat ./nested.html`,
    )
  })

  it("rewrites chat webapp dev scripts to the local chat runner", () => {
    const output = rewriteChatWebappPackageJson(
      `${JSON.stringify({
        scripts: {
          dev: `bunx --bun -p ${tarballUrl} web-native-ai-chat index.html`,
        },
      }, null, 2)}\n`,
      { mode: "local", runnerPath: "../ai-broker.webapp/chat-runner.ts" },
    )

    expect(JSON.parse(output).scripts.dev).toBe(
      "bun ../ai-broker.webapp/chat-runner.ts index.html",
    )
  })

  it("rewrites broker runner comments to the resolved GitHub tarball", () => {
    const input = `<!doctype html>
<!--
Run this demo with the Codex broker
These demos are hard-coded to the local Codex broker exposed by broker-runner.
GitHub:
bunx --bun -p https://github.com/subtleGradient/web-native/archive/refs/heads/main.tar.gz web-native-ai-broker src/ai.web/examples/index.html
Local checkout:
bun "./src/ai-broker.webapp/broker-runner.ts" src/ai.web/examples/index.html
-->
<title>Demo</title>`

    const output = rewriteBrokerRunnerInstructions(input, {
      tarballUrl,
      repoPath: "src/ai.web/examples/index.html",
    })

    expect(output).toContain(
      `bunx --bun -p ${tarballUrl} web-native-ai-broker src/ai.web/examples/index.html`,
    )
    expect(output).not.toContain("refs/heads/main.tar.gz")
  })
})
