import { spawn, spawnSync, type SpawnSyncReturns } from "node:child_process"
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect } from "vitest"

export function hasCommand(command: string): boolean {
  const lookup = process.platform === "win32" ? "where" : "which"
  const result = spawnSync(lookup, [command], { stdio: "ignore" })
  return result.status === 0
}

export function runCli(args: string[], timeoutMs = 180_000): SpawnSyncReturns<string> {
  const cliPath = join(process.cwd(), "dist", "index.js")

  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: timeoutMs,
  })
}

export interface CliAsyncResult {
  error?: Error
  status: number | null
  stdout: string
  stderr: string
}

export function runCliAsync(args: string[], timeoutMs = 180_000): Promise<CliAsyncResult> {
  const cliPath = join(process.cwd(), "dist", "index.js")

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    let settled = false

    const finish = (result: CliAsyncResult): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve(result)
    }

    const timeout = setTimeout(() => {
      child.kill("SIGKILL")
      finish({
        error: new Error(`CLI process timed out after ${timeoutMs}ms`),
        status: null,
        stdout,
        stderr,
      })
    }, timeoutMs)

    child.stdout?.setEncoding("utf8")
    child.stderr?.setEncoding("utf8")

    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk
    })

    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk
    })

    child.on("error", (error) => {
      finish({
        error,
        status: null,
        stdout,
        stderr,
      })
    })

    child.on("close", (code) => {
      finish({
        status: code,
        stdout,
        stderr,
      })
    })
  })
}

/**
 * Normalize Windows drive letter to lowercase for consistent path comparison.
 * No-op on non-Windows platforms.
 */
export function normalizeDriveLetter(p: string): string {
  return p.replace(/^([A-Z]):/, (_, drive: string) => `${drive.toLowerCase()}:`)
}

export function createFixtureWorkspace(
  language:
    | "typescript"
    | "java"
    | "javascript"
    | "python"
    | "php"
    | "go"
    | "rust"
    | "kotlin"
    | "bash"
    | "yaml"
    | "dockerfile"
    | "c"
    | "cpp"
    | "csharp"
    | "css"
    | "ruby"
    | "lua"
): string {
  const sourceDir = join(process.cwd(), "tests", "fixtures", language)
  const workspaceDir = mkdtempSync(join(tmpdir(), `oh-my-lsp-${language}-`))
  cpSync(sourceDir, workspaceDir, { recursive: true })
  return workspaceDir
}

export function cleanupWorkspace(workspaceDir: string): void {
  rmSync(workspaceDir, { recursive: true, force: true })
}

export function findNthOccurrencePosition(
  filePath: string,
  needle: string,
  occurrence: number
): { line: number; character: number } {
  const lines = readFileSync(filePath, "utf8").split("\n")
  let seen = 0

  for (let line = 0; line < lines.length; line++) {
    const text = lines[line]
    let startIndex = 0

    while (startIndex < text.length) {
      const matchIndex = text.indexOf(needle, startIndex)
      if (matchIndex < 0) break
      seen++
      if (seen === occurrence) {
        return { line, character: matchIndex }
      }
      startIndex = matchIndex + needle.length
    }
  }

  throw new Error(`Could not find occurrence ${occurrence} of "${needle}" in ${filePath}`)
}

export function expectCliSuccess(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).not.toContain("Error:")
}

export function expectCliSuccessOrKnownFailure(result: { error?: Error; status: number | null; stdout: string }): void {
  expect(result.error).toBeUndefined()
  expect([0, 1]).toContain(result.status)

  if (result.status === 1) {
    expect(result.stdout).toContain("Error:")
    return
  }

  expect(result.stdout).not.toContain("Error:")
}

export function useWorkspaceTracker(): { track: (workspace: string) => string } {
  const workspaces: string[] = []

  afterEach(() => {
    for (const workspace of workspaces.splice(0)) {
      cleanupWorkspace(workspace)
    }
  })

  function track(workspace: string): string {
    workspaces.push(workspace)
    return workspace
  }

  return { track }
}
