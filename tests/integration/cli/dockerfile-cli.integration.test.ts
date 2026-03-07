import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  createFixtureWorkspace,
  expectCliSuccess,
  hasCommand,
  runCli,
  useWorkspaceTracker,
} from "./cli-test-utils"

const describeIfDockerfileServer = hasCommand("docker-langserver") ? describe : describe.skip
const { track } = useWorkspaceTracker()

function createWorkspaceFiles(): { workspace: string; sampleFile: string; diagnosticsFailFile: string } {
  const workspace = track(createFixtureWorkspace("dockerfile"))
  return {
    workspace,
    sampleFile: join(workspace, "sample.dockerfile"),
    diagnosticsFailFile: join(workspace, "diagnostics_fail.dockerfile"),
  }
}

describeIfDockerfileServer("CLI integration (Dockerfile)", () => {
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

  it.skip("runs goto_definition", () => {})
  it.skip("runs find_references", () => {})
  it.skip("runs prepare_rename", () => {})
  it.skip("runs rename", () => {})
})
