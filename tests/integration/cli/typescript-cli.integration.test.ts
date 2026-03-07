import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  createFixtureWorkspace,
  expectCliSuccess,
  findNthOccurrencePosition,
  hasCommand,
  normalizeDriveLetter,
  runCli,
  useWorkspaceTracker,
} from "./cli-test-utils"

const describeIfTypescriptServer = hasCommand("typescript-language-server") ? describe : describe.skip
const { track } = useWorkspaceTracker()

function createWorkspaceFiles(): {
  workspace: string
  sampleFile: string
  diagnosticsFailFile: string
} {
  const workspace = track(createFixtureWorkspace("typescript"))
  return {
    workspace,
    sampleFile: join(workspace, "sample.ts"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.ts"),
  }
}

describeIfTypescriptServer("CLI integration (TypeScript)", () => {
  it("runs symbols", () => {
    const { workspace, sampleFile } = createWorkspaceFiles()
    const result = runCli(["symbols", sampleFile, "--scope", "document", "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout).toContain("add")
  }, 120_000)

  it("runs diagnostics", () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()
    const result = runCli([
      "diagnostics",
      diagnosticsFailFile,
      "--base-path",
      workspace,
      "--timeout",
      "60000",
    ])

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
    expect(normalizeDriveLetter(result.stdout)).toContain(normalizeDriveLetter(sampleFile))
    expect(result.stdout).toMatch(/:1:\d+/)
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
    const normalizedSampleFile = normalizeDriveLetter(sampleFile)
    const referenceLines = result.stdout
      .split("\n")
      .filter((line) => normalizeDriveLetter(line.trim()).startsWith(normalizedSampleFile))
    expect(referenceLines.length).toBeGreaterThanOrEqual(2)
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
    expect(result.stdout).toContain("Rename")
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

    expectCliSuccess(result)
    expect(result.stdout).toContain("Applied")

    const updated = readFileSync(sampleFile, "utf8")
    expect(updated).toContain("function sum")
    expect(updated).toContain("sum(1, 2)")
  }, 120_000)
})
