import { spawnSync, type SpawnSyncReturns } from "node:child_process"
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

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
