import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  createFixtureWorkspace,
  expectCliSuccess,
  findNthOccurrencePosition,
  hasCommand,
  runCli,
  runCliAsync,
  useWorkspaceTracker,
} from "./cli-test-utils"

const describeIfJdtls = hasCommand("jdtls") ? describe : describe.skip
const { track } = useWorkspaceTracker()

function createWorkspaceFiles(): {
  workspace: string
  appFile: string
  helperFile: string
  diagnosticsFailFile: string
} {
  const workspace = track(createFixtureWorkspace("java"))
  return {
    workspace,
    appFile: join(workspace, "App.java"),
    helperFile: join(workspace, "Helper.java"),
    diagnosticsFailFile: join(workspace, "DiagnosticsFail.java"),
  }
}

describeIfJdtls("CLI integration (Java)", () => {
  it("runs symbols", () => {
    const { workspace, appFile } = createWorkspaceFiles()
    const result = runCli(["symbols", appFile, "--scope", "document", "--base-path", workspace, "--timeout", "120000"], 240_000)

    expectCliSuccess(result)
    expect(result.stdout).toContain("App")
  }, 240_000)

  it("runs diagnostics", async () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()

    const warmup = runCli(["symbols", diagnosticsFailFile, "--scope", "document", "--base-path", workspace, "--timeout", "120000"], 240_000)
    expectCliSuccess(warmup)

    const result = await runCliAsync([
      "diagnostics",
      diagnosticsFailFile,
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)
    expect(result.stdout).not.toContain("No diagnostics found")
    expect(result.stdout).toMatch(/ at \d+:\d+:/)
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

    const definitionPos = findNthOccurrencePosition(helperFile, "add(", 1)

    const result = runCli([
      "find_references",
      helperFile,
      String(definitionPos.line),
      String(definitionPos.character),
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
