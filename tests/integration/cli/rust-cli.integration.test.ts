import { spawnSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupWorkspace,
  createFixtureWorkspace,
  findNthOccurrencePosition,
  runCli,
} from "./cli-test-utils"

function hasWorkingRustAnalyzer(): boolean {
  const versionCheck = spawnSync("rust-analyzer", ["--version"], { stdio: "ignore" })
  return versionCheck.status === 0
}

const describeIfRustServer = hasWorkingRustAnalyzer() ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = createFixtureWorkspace("rust")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "src", "main.rs"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.rs"),
  }
}

function createSampleWorkspaceFiles(): { workspace: string; sampleFile: string } {
  const { workspace, sampleFile, diagnosticsFailFile } = createWorkspaceFiles()
  rmSync(diagnosticsFailFile, { force: true })
  return { workspace, sampleFile }
}

function createDiagnosticsWorkspaceFiles(): { workspace: string; diagnosticsFailFile: string } {
  const { workspace, sampleFile, diagnosticsFailFile } = createWorkspaceFiles()
  const failingSource = readFileSync(diagnosticsFailFile, "utf8")
  rmSync(diagnosticsFailFile, { force: true })
  // Keep file inside crate entrypoint so rust-analyzer can report diagnostics reliably.
  writeFileSync(sampleFile, failingSource, "utf8")
  return { workspace, diagnosticsFailFile: sampleFile }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

describeIfRustServer("CLI integration (Rust)", () => {
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


  it("runs find_references", () => {
    const { workspace, sampleFile } = createSampleWorkspaceFiles()
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
    expect(result.stdout).toContain("Rename")
  }, 120_000)

  it("runs goto_definition", () => {
    const { workspace, sampleFile } = createSampleWorkspaceFiles()
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
    expect(result.stdout).toContain(sampleFile)
  }, 120_000)

  it("runs rename", () => {
    const { workspace, sampleFile } = createSampleWorkspaceFiles()
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

    expectCliSuccess(result)
    expect(result.stdout).toContain("Applied")

    const updated = readFileSync(sampleFile, "utf8")
    expect(updated).toContain("fn sum")
    expect(updated).toContain("sum(1, 2)")
  }, 120_000)
})
