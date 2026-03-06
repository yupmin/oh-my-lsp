import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  createFixtureWorkspace,
  expectCliSuccess,
  hasCommand,
  runCli,
  useWorkspaceTracker,
} from "./cli-test-utils"

const describeIfCssServer = hasCommand("biome") ? describe : describe.skip
const { track } = useWorkspaceTracker()

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = track(createFixtureWorkspace("css"))
  return {
    workspace,
    sampleFile: join(workspace, "sample.css"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.css"),
  }
}

describeIfCssServer("CLI integration (CSS)", () => {
  // biome does not support textDocument/documentSymbol for CSS files
  it.skip("runs symbols", () => {})

  it("runs diagnostics", () => {
    const { workspace, diagnosticsFailFile } = createWorkspaceFiles()
    const result = runCli(["diagnostics", diagnosticsFailFile, "--base-path", workspace, "--timeout", "60000"])

    expectCliSuccess(result)
    expect(result.stdout).not.toContain("No diagnostics found")
    expect(result.stdout).toMatch(/ at \d+:\d+:/)
  }, 120_000)

  it.skip("runs goto_definition", () => {})
  it.skip("runs find_references", () => {})
  it.skip("runs prepare_rename", () => {})
  it.skip("runs rename", () => {})
})
