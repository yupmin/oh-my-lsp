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
    expect(result.stdout).toContain("add")
  }, 120_000)

  it("runs diagnostics", () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()
    const result = runCli(["diagnostics", diagnosticsFailFile, "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout).not.toContain("No diagnostics found")
    expect(result.stdout).toMatch(/ at \d+:\d+:/)
  }, 120_000)

  it("runs goto_definition", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
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
    const { workspace, sampleFile } = createWorkspaceFiles()
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

  // intelephense does not support rename for plain PHP functions
  it.skip("runs prepare_rename", () => {})

  // intelephense does not support rename for plain PHP functions
  it.skip("runs rename", () => {})
})
