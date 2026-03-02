import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupWorkspace,
  createFixtureWorkspace,
  hasCommand,
  runCli,
} from "./cli-test-utils"

const describeIfCssServer = hasCommand("biome") ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = createFixtureWorkspace("css")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "sample.css"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.css"),
  }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

describeIfCssServer("CLI integration (CSS)", () => {
  // biome does not support textDocument/documentSymbol for CSS files
  it.skip("runs symbols", () => {})

  it("runs diagnostics", () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()
    const result = runCli(["diagnostics", diagnosticsFailFile, "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout).not.toContain("No diagnostics found")
    expect(result.stdout).toMatch(/ at \d+:\d+:/)
  }, 120_000)

  it.skip("runs goto_definition", () => {})
  it.skip("runs find_references", () => {})
  it.skip("runs prepare_rename", () => {})
  it.skip("runs rename", () => {})
})
