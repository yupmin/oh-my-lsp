import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupWorkspace,
  createFixtureWorkspace,
  runCli,
} from "./cli-test-utils"

const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = createFixtureWorkspace("scala")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "sample.scala"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.scala"),
  }
}

function expectNotConfigured(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(1)
  expect(result.stdout).toContain("No LSP server configured for extension: .scala")
}

describe("CLI integration (Scala)", () => {
  it("symbols reports not configured", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["symbols", sampleFile, "--scope", "document", "--base-path", workspace, "--timeout", "60000"])
    expectNotConfigured(result)
  }, 120_000)

  it("diagnostics reports not configured", () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()
    const result = runCli(["diagnostics", diagnosticsFailFile, "--base-path", workspace, "--timeout", "60000"])
    expectNotConfigured(result)
  }, 120_000)

  it("goto_definition reports not configured", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["goto_definition", sampleFile, "--line", "0", "--character", "0", "--base-path", workspace, "--timeout", "60000"])
    expectNotConfigured(result)
  }, 120_000)

  it("find_references reports not configured", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["find_references", sampleFile, "--line", "0", "--character", "0", "--base-path", workspace, "--timeout", "60000"])
    expectNotConfigured(result)
  }, 120_000)

  it("prepare_rename reports not configured", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["prepare_rename", sampleFile, "--line", "0", "--character", "0", "--base-path", workspace, "--timeout", "60000"])
    expectNotConfigured(result)
  }, 120_000)

  it("rename reports not configured", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["rename", sampleFile, "sum", "--line", "0", "--character", "0", "--base-path", workspace, "--timeout", "60000"])
    expectNotConfigured(result)
  }, 120_000)
})
