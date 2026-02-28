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

describeIfSg("CLI integration (ast_grep_search, TypeScript)", () => {
  it("finds console.log calls in TypeScript fixtures", () => {
    const { workspace } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_search",
      "typescript",
      "console.log($ARG)",
      "--paths",
      workspace,
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("Found")
    expect(result.stdout).toContain("match")
    expect(result.stdout).toContain("console.log")
  })

  it("finds exported function declarations with meta-variables", () => {
    const { workspace } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_search",
      "typescript",
      "export function $NAME($$$PARAMS): $RET { $$$BODY }",
      "--paths",
      workspace,
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("Found")
    expect(result.stdout).toContain("match")
  })

  it("returns no matches for non-existent pattern", () => {
    const { workspace } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_search",
      "typescript",
      "nonExistentMethod12345($ARG)",
      "--paths",
      workspace,
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("No matches found")
  })

  it("supports --globs option to filter files", () => {
    const { workspace } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_search",
      "typescript",
      "export function $NAME($$$PARAMS): $RET { $$$BODY }",
      "--paths",
      workspace,
      "--globs",
      "**/diagnostics_fail.ts",
      "--globs",
      "!**/sample.ts",
    ])

    expectCliSuccess(result)
    // Only diagnostics_fail.ts is searched; its export function has a type error arg but still matches structurally
    expect(result.stdout).toContain("Found")
    expect(result.stdout).toContain("diagnostics_fail.ts")
    expect(result.stdout).not.toContain("sample.ts")
  })

  it("supports --context option for surrounding lines", () => {
    const { workspace } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_search",
      "typescript",
      "console.log($ARG)",
      "--paths",
      workspace,
      "--context",
      "2",
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("Found")
  })

  it("finds const declarations", () => {
    const { workspace } = createTypeScriptWorkspace()

    const result = runCli([
      "ast_grep_search",
      "typescript",
      "const $NAME = add($$$ARGS)",
      "--paths",
      workspace,
    ])

    expectCliSuccess(result)
    expect(result.stdout).toContain("Found")
    expect(result.stdout).toContain("match")
  })
})
