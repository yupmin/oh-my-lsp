import { readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupWorkspace,
  createFixtureWorkspace,
  findNthOccurrencePosition,
  hasCommand,
  runCli,
} from "./cli-test-utils"

const describeIfGoServer = hasCommand("gopls") ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = createFixtureWorkspace("go")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "sample.go"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.go"),
  }
}

function createSampleWorkspaceFiles(): { workspace: string; sampleFile: string } {
  const { workspace, sampleFile, diagnosticsFailFile } = createWorkspaceFiles()
  // Keep navigation/rename scenarios isolated to a single valid file.
  rmSync(diagnosticsFailFile, { force: true })
  return { workspace, sampleFile }
}

function createDiagnosticsWorkspaceFiles(): { workspace: string; diagnosticsFailFile: string } {
  const { workspace, sampleFile, diagnosticsFailFile } = createWorkspaceFiles()
  // Keep diagnostics scenarios isolated to avoid duplicate symbol interference.
  rmSync(sampleFile, { force: true })
  return { workspace, diagnosticsFailFile }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

describeIfGoServer("CLI integration (Go)", () => {
  it("runs symbols", () => {
    const { workspace, sampleFile } = createSampleWorkspaceFiles()
    const result = runCli(["symbols", sampleFile, "--scope", "document", "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout.length).toBeGreaterThan(0)
  }, 120_000)

  it("runs diagnostics", () => {
    const { workspace, diagnosticsFailFile } = createDiagnosticsWorkspaceFiles()
    const result = runCli(["diagnostics", diagnosticsFailFile, "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout).not.toContain("No diagnostics found")
    expect(result.stdout).toMatch(/ at \d+:\d+:/)
  }, 120_000)

  it("runs goto_definition", () => {
    const { workspace, sampleFile } = createSampleWorkspaceFiles()
    const callPos = findNthOccurrencePosition(sampleFile, "add(", 2)

    const result = runCli([
      "goto_definition",
      sampleFile,
      String(callPos.line),
      String(callPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "60000",
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain(sampleFile)
  }, 120_000)

  it("runs find_references", () => {
    const { workspace, sampleFile } = createSampleWorkspaceFiles()
    const definitionPos = findNthOccurrencePosition(sampleFile, "add(", 1)

    const result = runCli([
      "find_references",
      sampleFile,
      String(definitionPos.line),
      String(definitionPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "60000",
    ])

    expectCliSuccess(result)
    const referenceLines = result.stdout
      .split("\n")
      .filter((line) => line.trim().startsWith(sampleFile))
    expect(referenceLines.length).toBeGreaterThanOrEqual(2)
  }, 120_000)

  it("runs prepare_rename", () => {
    const { workspace, sampleFile } = createSampleWorkspaceFiles()
    const definitionPos = findNthOccurrencePosition(sampleFile, "add(", 1)

    const result = runCli([
      "prepare_rename",
      sampleFile,
      String(definitionPos.line),
      String(definitionPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "60000",
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("Rename")
  }, 120_000)

  it("runs rename", () => {
    const { workspace, sampleFile } = createSampleWorkspaceFiles()
    const definitionPos = findNthOccurrencePosition(sampleFile, "add(", 1)

    const result = runCli([
      "rename",
      sampleFile,
      "sum",
      String(definitionPos.line),
      String(definitionPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "60000",
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("Applied")

    const updated = readFileSync(sampleFile, "utf8")
    expect(updated).toContain("func sum")
    expect(updated).toContain("sum(1, 2)")
  }, 120_000)
})
