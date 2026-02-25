import { existsSync, statSync } from "fs"
import { join } from "path"

function isValidBinary(filePath: string): boolean {
  try {
    return statSync(filePath).size > 0
  } catch {
    return false
  }
}

export function findSgCliPathSync(): string | null {
  const envPath = process.env.OH_MY_LSP_AST_GREP_BIN ?? process.env.AST_GREP_BINARY
  if (envPath && existsSync(envPath) && isValidBinary(envPath)) {
    return envPath
  }

  const localBinary = join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "sg.cmd" : "sg"
  )
  if (existsSync(localBinary) && isValidBinary(localBinary)) {
    return localBinary
  }

  if (process.platform === "darwin") {
    const homebrewPaths = ["/opt/homebrew/bin/sg", "/usr/local/bin/sg"]
    for (const path of homebrewPaths) {
      if (existsSync(path) && isValidBinary(path)) {
        return path
      }
    }
  }

  return null
}

let resolvedCliPath: string | null = null

export function getSgCliPath(): string | null {
  if (resolvedCliPath !== null) {
    return resolvedCliPath
  }

  const path = findSgCliPathSync()
  if (path) {
    resolvedCliPath = path
  }
  return path
}

export function setSgCliPath(path: string): void {
  resolvedCliPath = path
}
