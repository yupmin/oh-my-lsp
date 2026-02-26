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

function expectCssSymbolsResult(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()

  if (result.status === 0) {
    expect(result.stdout).not.toContain("Error:")
    return
  }

  expect(result.status).toBe(1)
  expect(result.stdout).toContain("Error:")
  // Biome's unsupported-feature message text varies by version/environment.
  expect(result.stdout.length).toBeGreaterThan(0)
}

describeIfCssServer("CLI integration (CSS)", () => {
  it("runs symbols", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["symbols", sampleFile, "--scope", "document", "--base-path", workspace, "--timeout", "60000"])

    expectCssSymbolsResult(result)
    if (result.status === 0) {
      expect(result.stdout.length).toBeGreaterThan(0)
    }
  }, 120_000)

  it("runs diagnostics", () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()
    const result = runCli(["diagnostics", diagnosticsFailFile, "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout).not.toContain("No diagnostics found")
    expect(result.stdout).toMatch(/ at \d+:\d+:/)
  }, 120_000)
})
