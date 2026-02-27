import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupWorkspace,
  createFixtureWorkspace,
  hasCommand,
  runCli,
} from "./cli-test-utils"

const describeIfRubyServer = hasCommand("rubocop") ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = createFixtureWorkspace("ruby")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "sample.rb"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.rb"),
  }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

describeIfRubyServer("CLI integration (Ruby)", () => {
  it("runs symbols", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["symbols", sampleFile, "--scope", "document", "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout.length).toBeGreaterThan(0)
  }, 120_000)

  it("runs diagnostics", () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()
    const result = runCli(["diagnostics", diagnosticsFailFile, "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout).not.toContain("No diagnostics found")
    expect(result.stdout).toMatch(/ at \d+:\d+:/)
  }, 120_000)

  // rubocop-lsp does not support textDocument/definition
  it.skip("runs goto_definition", () => {})

  // rubocop-lsp does not support textDocument/references
  it.skip("runs find_references", () => {})

  // rubocop-lsp does not support textDocument/prepareRename
  it.skip("runs prepare_rename", () => {})

  // rubocop-lsp does not support workspace rename
  it.skip("runs rename", () => {})
})
