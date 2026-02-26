import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupWorkspace,
  createFixtureWorkspace,
  findNthOccurrencePosition,
  hasCommand,
  runCli,
} from "./cli-test-utils"

const describeIfPhpServer = hasCommand("intelephense") ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = createFixtureWorkspace("php")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "sample.php"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.php"),
  }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

describeIfPhpServer("CLI integration (PHP)", () => {
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
    const hasNoDiagnostics = result.stdout.includes("No diagnostics found")
    const hasDiagnosticLine = / at \d+:\d+:/.test(result.stdout)
    expect(hasNoDiagnostics || hasDiagnosticLine).toBe(true)
  }, 120_000)

  it("runs goto_definition", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const callPos = findNthOccurrencePosition(sampleFile, "add(", 2)

    const result = runCli([
      "goto_definition",
      sampleFile,
      "--line",
      String(callPos.line),
      "--character",
      String(callPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "60000",
    ])

    expectCliSuccess(result)
    expect(result.stdout.length).toBeGreaterThan(0)
  }, 120_000)

  it("runs find_references", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const definitionPos = findNthOccurrencePosition(sampleFile, "add(", 1)

    const result = runCli([
      "find_references",
      sampleFile,
      "--line",
      String(definitionPos.line),
      "--character",
      String(definitionPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "60000",
    ])

    expectCliSuccess(result)
  }, 120_000)

  it("runs prepare_rename", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const definitionPos = findNthOccurrencePosition(sampleFile, "add(", 1)

    const result = runCli([
      "prepare_rename",
      sampleFile,
      "--line",
      String(definitionPos.line),
      "--character",
      String(definitionPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "60000",
    ])

    expectCliSuccess(result)
    expect(result.stdout.length).toBeGreaterThan(0)
  }, 120_000)

  it("runs rename", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const definitionPos = findNthOccurrencePosition(sampleFile, "add(", 1)

    const result = runCli([
      "rename",
      sampleFile,
      "sum",
      "--line",
      String(definitionPos.line),
      "--character",
      String(definitionPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "60000",
    ])

    expect(result.error).toBeUndefined()
    expect([0, 1]).toContain(result.status)

    if (result.status === 1) {
      // intelephense may refuse edit application depending on workspace state
      expect(result.stdout).toContain("No edit provided")
      return
    }

    const applied = result.stdout.includes("Applied")
    const failedToApply = result.stdout.includes("Failed to apply some changes")
    expect(applied || failedToApply).toBe(true)

    if (applied) {
      const updated = readFileSync(sampleFile, "utf8")
      expect(updated).toContain("sum")
    }
  }, 120_000)
})
