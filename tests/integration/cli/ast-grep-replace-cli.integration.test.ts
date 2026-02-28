import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupWorkspace,
  createFixtureWorkspace,
  hasCommand,
  runCli,
} from "./cli-test-utils"

const describeIfSg = hasCommand("sg") ? describe : describe.skip
const workspaces: string[] = []

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    cleanupWorkspace(workspace)
  }
})

function createTypeScriptWorkspace(): { workspace: string; sampleFile: string } {
  const workspace = createFixtureWorkspace("typescript")
  workspaces.push(workspace)
  return {
    workspace,
    sampleFile: join(workspace, "sample.ts"),
  }
}

function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

describeIfSg("CLI integration (ast_grep_replace, TypeScript)", () => {
  it("dry-run shows replacements without modifying files", () => {
    const { workspace, sampleFile } = createTypeScriptWorkspace()
    const originalContent = readFileSync(sampleFile, "utf8")

    const result = runCli([
      "ast_grep_replace",
      "typescript",
      "console.log($ARG)",
      "console.error($ARG)",
      "--paths",
      workspace,
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("[DRY RUN]")
    expect(result.stdout).toContain("replacement")

    // File should remain unchanged in dry-run mode
    const afterContent = readFileSync(sampleFile, "utf8")
    expect(afterContent).toBe(originalContent)
  })

  it("applies replacement with --no-dry-run", () => {
    const { workspace, sampleFile } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_replace",
      "typescript",
      "console.log($ARG)",
      "console.error($ARG)",
      "--paths",
      workspace,
      "--no-dry-run",
    ])

    expectCliSuccess(result)
    expect(result.stdout).not.toContain("[DRY RUN]")
    expect(result.stdout).toContain("replacement")

    const updatedContent = readFileSync(sampleFile, "utf8")
    expect(updatedContent).toContain("console.error(result)")
    expect(updatedContent).not.toContain("console.log")
  })

  it("returns no replacements for non-matching pattern", () => {
    const { workspace } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_replace",
      "typescript",
      "nonExistentMethod12345($ARG)",
      "replaced($ARG)",
      "--paths",
      workspace,
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("No matches found")
  })

  it("supports --globs option to limit replacement scope", () => {
    const { workspace, sampleFile } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_replace",
      "typescript",
      "console.log($ARG)",
      "console.error($ARG)",
      "--paths",
      workspace,
      "--globs",
      "**/diagnostics_fail.ts",
      "--no-dry-run",
    ])

    expectCliSuccess(result)

    // sample.ts should remain untouched
    const sampleContent = readFileSync(sampleFile, "utf8")
    expect(sampleContent).toContain("console.log(result)")
  })

  it("replaces function call arguments using meta-variables", () => {
    const { workspace, sampleFile } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_replace",
      "typescript",
      "add($A, $B)",
      "add($B, $A)",
      "--paths",
      workspace,
      "--no-dry-run",
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("replacement")

    const updatedContent = readFileSync(sampleFile, "utf8")
    expect(updatedContent).toContain("add(2, 1)")
  })

  it("dry-run includes hint to use --no-dry-run", () => {
    const { workspace } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_replace",
      "typescript",
      "console.log($ARG)",
      "console.error($ARG)",
      "--paths",
      workspace,
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("--no-dry-run")
  })
})
