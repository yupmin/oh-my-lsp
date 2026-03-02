import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupWorkspace,
  createFixtureWorkspace,
  findNthOccurrencePosition,
  hasCommand,
  runCliAsync,
} from "./cli-test-utils"

const describeIfKotlinLs = hasCommand("kotlin-lsp") ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = createFixtureWorkspace("kotlin")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "sample.kt"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.kt"),
  }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

describeIfKotlinLs("CLI integration (Kotlin)", () => {
  it("runs symbols", async () => {
    const { workspace, sampleFile } = createWorkspaceFiles()

    const result = await runCliAsync([
      "symbols",
      sampleFile,
      "--scope",
      "document",
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)
    expect(result.stdout).toContain("Greeter")
  }, 240_000)

  it("runs diagnostics", async () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()

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

  it("runs goto_definition", async () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const callPos = findNthOccurrencePosition(sampleFile, "add(", 2)

    const result = await runCliAsync([
      "goto_definition",
      sampleFile,
      String(callPos.line),
      String(callPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)
    expect(result.stdout).toContain(sampleFile)
    expect(result.stdout).toMatch(/:2:\d+/)
  }, 240_000)

  it("runs find_references", async () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const callPos = findNthOccurrencePosition(sampleFile, "add(", 2)

    const result = await runCliAsync([
      "find_references",
      sampleFile,
      String(callPos.line),
      String(callPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)
    const referenceLines = result.stdout
      .split("\n")
      .filter((line) => line.includes(sampleFile))
    expect(referenceLines.length).toBeGreaterThanOrEqual(2)
  }, 240_000)

  it.skip("runs prepare_rename", () => {})

  it("runs rename", async () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const definitionPos = findNthOccurrencePosition(sampleFile, "add(", 1)

    const result = await runCliAsync([
      "rename",
      sampleFile,
      "sum",
      String(definitionPos.line),
      String(definitionPos.character),
      "--base-path",
      workspace,
      "--timeout",
      "120000",
    ], 240_000)

    expectCliSuccess(result)

    const applied = result.stdout.includes("Applied")
    const failedToApply = result.stdout.includes("Failed to apply some changes")
    expect(applied || failedToApply).toBe(true)

    if (applied) {
      const updated = readFileSync(sampleFile, "utf8")
      expect(updated).toContain("sum(")
    }
  }, 240_000)
})
