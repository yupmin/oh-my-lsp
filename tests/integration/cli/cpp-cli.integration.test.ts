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

const describeIfCppServer = hasCommand("clangd") ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = createFixtureWorkspace("cpp")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "sample.cpp"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.cpp"),
  }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

describeIfCppServer("CLI integration (C++)", () => {
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
    const hasSamplePath = result.stdout.includes(sampleFile)
    const hasNoDefinition = result.stdout.includes("No definition found")
    expect(hasSamplePath || hasNoDefinition).toBe(true)
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
    const hasNoReferences = result.stdout.includes("No references found")
    const referenceLines = result.stdout
      .split("\n")
      .filter((line) => line.trim().startsWith(sampleFile))
    expect(hasNoReferences || referenceLines.length >= 2).toBe(true)
  }, 120_000)

  it("runs prepare_rename", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
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
    const supported = result.stdout.includes("Rename")
    const unsupported = result.stdout.includes("Cannot rename at this position")
    expect(supported || unsupported).toBe(true)
  }, 120_000)

  it("runs rename", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
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

    expect([0, 1]).toContain(result.status)
    expect(result.error).toBeUndefined()

    if (result.status === 1) {
      expect(result.stdout).toContain("Error:")
      return
    }

    const applied = result.stdout.includes("Applied")
    const partialFailure = result.stdout.includes("Failed to apply some changes")
    expect(applied || partialFailure).toBe(true)

    if (applied) {
      const updated = readFileSync(sampleFile, "utf8")
      expect(updated).toContain("sum(")
      expect(updated).toContain("sum(1, 2)")
    }
  }, 120_000)
})
