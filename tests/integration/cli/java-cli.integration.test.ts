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

const describeIfJdtls = hasCommand("jdtls") ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): {
  workspace: string
  appFile: string
  helperFile: string
  diagnosticsFailFile: string
} {
  const workspace = createFixtureWorkspace("java")
  workspaces.push(workspace)
  return {
    workspace,
    appFile: join(workspace, "App.java"),
    helperFile: join(workspace, "Helper.java"),
    diagnosticsFailFile: join(workspace, "DiagnosticsFail.java"),
  }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

describeIfJdtls("CLI integration (Java)", () => {
  it("runs symbols", () => {
    const { workspace, appFile } = createWorkspaceFiles()
    const result = runCli(["symbols", appFile, "--scope", "document", "--base-path", workspace, "--timeout", "120000"], 240_000)

    expectCliSuccess(result)
    expect(result.stdout).toContain("App")
  }, 240_000)

  it("runs diagnostics", () => {
    const { workspace, appFile } = createWorkspaceFiles()

    const warmup = runCli(["symbols", appFile, "--scope", "document", "--base-path", workspace, "--timeout", "120000"], 240_000)
    expectCliSuccess(warmup)

    const result = runCli([
      "diagnostics",
      appFile,
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)
    const hasNoDiagnostics = result.stdout.includes("No diagnostics found")
    const hasDiagnosticLine = / at \d+:\d+:/.test(result.stdout)
    expect(hasNoDiagnostics || hasDiagnosticLine).toBe(true)
  }, 240_000)

  it("runs goto_definition", () => {
    const { workspace, appFile, helperFile } = createWorkspaceFiles()
    const callPos = findNthOccurrencePosition(appFile, "add(", 1)

    const result = runCli([
      "goto_definition",
      appFile,
      String(callPos.line),
      String(callPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)
    expect(result.stdout).toContain(helperFile)
    expect(result.stdout).toMatch(/:2:\d+/)
  }, 240_000)

  it("runs find_references", () => {
    const { workspace, helperFile } = createWorkspaceFiles()

    const result = runCli([
      "find_references",
      helperFile,
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)
  }, 240_000)

  it("runs prepare_rename", () => {
    const { workspace, helperFile } = createWorkspaceFiles()
    const definitionPos = findNthOccurrencePosition(helperFile, "add(", 1)

    const result = runCli([
      "prepare_rename",
      helperFile,
      String(definitionPos.line),
      String(definitionPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)
    expect(result.stdout).toContain("Rename")
  }, 240_000)

  it("runs rename", () => {
    const { workspace, helperFile, appFile } = createWorkspaceFiles()
    const definitionPos = findNthOccurrencePosition(helperFile, "add(", 1)

    const result = runCli([
      "rename",
      helperFile,
      "sum",
      String(definitionPos.line),
      String(definitionPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)
    expect(result.stdout).toContain("Applied")

    const helperText = readFileSync(helperFile, "utf8")
    const appText = readFileSync(appFile, "utf8")
    expect(helperText).toContain("sum(")
    expect(appText).toContain("Helper.sum(")
  }, 240_000)
})
