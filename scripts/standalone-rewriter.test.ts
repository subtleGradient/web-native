import { describe, expect, it } from "bun:test"
import {
  formatGithubTarballUrl,
  rewriteChatWebappPackageJson,
  rewriteOpenAIRunnerInstructions,
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
        scripts: { dev: "bun --hot openai-runner.ts index.html" },
      }, null, 2)}\n`,
      { mode: "cdn", tarballUrl },
    )

    expect(JSON.parse(output).scripts.dev).toBe(
      `bunx --bun -p ${tarballUrl} web-native-openai-chat index.html`,
    )
  })

  it("preserves existing chat runner launch paths", () => {
    const output = rewriteChatWebappPackageJson(
      `${JSON.stringify({
        scripts: {
          dev: "bunx --bun -p https://github.com/subtleGradient/web-native/archive/old.tar.gz web-native-openai-chat ./nested.html",
        },
      }, null, 2)}\n`,
      { mode: "cdn", tarballUrl },
    )

    expect(JSON.parse(output).scripts.dev).toBe(
      `bunx --bun -p ${tarballUrl} web-native-openai-chat ./nested.html`,
    )
  })

  it("rewrites chat webapp dev scripts to the local chat runner", () => {
    const output = rewriteChatWebappPackageJson(
      `${JSON.stringify({
        scripts: {
          dev: `bunx --bun -p ${tarballUrl} web-native-openai-chat index.html`,
        },
      }, null, 2)}\n`,
      { mode: "local", runnerPath: "../openai-chat-runner.ts" },
    )

    expect(JSON.parse(output).scripts.dev).toBe(
      "bun ../openai-chat-runner.ts index.html",
    )
  })

  it("rewrites OpenAI runner comments to the resolved GitHub tarball", () => {
    const input = `<!doctype html>
<!--
Run this demo with the Codex broker
These demos are hard-coded to the local Codex broker exposed by openai-runner.
GitHub:
bunx --bun -p https://github.com/subtleGradient/web-native/archive/refs/heads/main.tar.gz web-native-openai src/openai/examples/index.html
Local checkout:
bun "./src/openai/Example OpenAI Codex Broker.webapp/openai-runner.ts" src/openai/examples/index.html
-->
<title>Demo</title>`

    const output = rewriteOpenAIRunnerInstructions(input, {
      tarballUrl,
      repoPath: "src/openai/examples/index.html",
    })

    expect(output).toContain(
      `bunx --bun -p ${tarballUrl} web-native-openai src/openai/examples/index.html`,
    )
    expect(output).not.toContain("refs/heads/main.tar.gz")
  })
})
