import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupWorkspace,
  createFixtureWorkspace,
  hasCommand,
  runCli,
} from "./cli-test-utils"

const describeIfHTMLServer = hasCommand("biome") ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = createFixtureWorkspace("html")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "sample.html"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.html"),
  }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

function expectSupportedOrUnsupported(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  if (result.status === 0) {
    expect(result.stdout).not.toContain("Error:")
    return
  }

  expect(result.status).toBe(1)
  expect(result.stdout).toContain("Error:")
}

describeIfHTMLServer("CLI integration (HTML)", () => {
  it("runs symbols", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["symbols", sampleFile, "--scope", "document", "--base-path", workspace, "--timeout", "60000"])

    expectSupportedOrUnsupported(result)
  }, 120_000)

  it("runs diagnostics", () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()
    const result = runCli(["diagnostics", diagnosticsFailFile, "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout.length).toBeGreaterThan(0)
  }, 120_000)

  it("checks goto_definition capability", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["goto_definition", sampleFile, "--line", "0", "--character", "0", "--base-path", workspace, "--timeout", "60000"])

    expectSupportedOrUnsupported(result)
  }, 120_000)

  it("checks find_references capability", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["find_references", sampleFile, "--line", "0", "--character", "0", "--base-path", workspace, "--timeout", "60000"])

    expectSupportedOrUnsupported(result)
  }, 120_000)

  it("checks prepare_rename capability", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["prepare_rename", sampleFile, "--line", "0", "--character", "0", "--base-path", workspace, "--timeout", "60000"])

    expectSupportedOrUnsupported(result)
  }, 120_000)

  it("checks rename capability", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["rename", sampleFile, "sum", "--line", "0", "--character", "0", "--base-path", workspace, "--timeout", "60000"])

    expectSupportedOrUnsupported(result)
  }, 120_000)
})
