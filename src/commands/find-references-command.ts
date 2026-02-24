import { readFileSync } from "node:fs"
import { readdirSync, statSync } from "node:fs"
import { dirname, extname, resolve, join } from "node:path"

import { DEFAULT_MAX_REFERENCES } from "../lsp/constants"
import { formatLocation } from "../lsp/lsp-formatters"
import { withLspClient } from "../lsp/lsp-client-wrapper"
import type { DocumentSymbol, Location, SymbolInfo } from "../lsp/types"

export interface FindReferencesArgs {
  filePath: string
  line: number
  character: number
  includeDeclaration?: boolean
  basePath?: string
}

function getFirstSymbolPositionFromDocumentSymbols(
  symbols: DocumentSymbol[] | SymbolInfo[] | null
): { line: number; character: number } | null {
  if (!symbols || symbols.length === 0) return null

  const first = symbols[0] as DocumentSymbol | SymbolInfo
  if ("range" in first) {
    return {
      line: first.range.start.line + 1,
      character: first.range.start.character,
    }
  }

  if ("location" in first) {
    return {
      line: first.location.range.start.line + 1,
      character: first.location.range.start.character,
    }
  }

  return null
}

function getFirstSymbolFromDocumentSymbols(
  symbols: DocumentSymbol[] | SymbolInfo[] | null
): { line: number; character: number; symbol: string } | null {
  if (!symbols || symbols.length === 0) return null

  const first = symbols[0] as DocumentSymbol | SymbolInfo
  if ("range" in first) {
    return {
      line: first.range.start.line + 1,
      character: first.range.start.character,
      symbol: first.name,
    }
  }

  if ("location" in first) {
    return {
      line: first.location.range.start.line + 1,
      character: first.location.range.start.character,
      symbol: first.name,
    }
  }

  return null
}

function getFirstSymbolFromSource(
  filePath: string
): { line: number; character: number; symbol: string } | null {
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n")
    const patterns = [
      /(?:public|private|protected|static|\s)*function\s+([A-Za-z_][A-Za-z0-9_]*)/,
      /(?:export\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/,
      /def\s+([A-Za-z_][A-Za-z0-9_]*)/,
      /class\s+([A-Za-z_][A-Za-z0-9_]*)/,
      /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)/,
    ]

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]
      for (const pattern of patterns) {
        const match = pattern.exec(lineText)
        if (!match) continue
        const symbol = match[1]
        const character = lineText.indexOf(symbol)
        if (character >= 0) {
          return { line: i + 1, character, symbol }
        }
      }
    }
  } catch {
  }

  return null
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function collectTextReferences(rootPath: string, symbol: string): string[] {
  const result: string[] = []
  const queue = [rootPath]
  const allowedExtensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mts",
    ".cts",
    ".mjs",
    ".cjs",
    ".py",
    ".php",
    ".java",
  ])
  const ignoredDirs = new Set([".git", "node_modules", "dist", "build"])
  const symbolRegex = new RegExp(`\\b${escapeRegex(symbol)}\\b`, "g")

  while (queue.length > 0) {
    const current = queue.shift()!
    let entries: import("node:fs").Dirent<string>[]
    try {
      entries = readdirSync(current, {
        withFileTypes: true,
        encoding: "utf8",
      }) as import("node:fs").Dirent<string>[]
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          queue.push(fullPath)
        }
        continue
      }

      if (!entry.isFile()) continue
      if (!allowedExtensions.has(extname(entry.name))) continue

      let stats
      try {
        stats = statSync(fullPath)
      } catch {
        continue
      }
      if (stats.size > 1024 * 1024) continue

      let lines: string[]
      try {
        lines = readFileSync(fullPath, "utf-8").split("\n")
      } catch {
        continue
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        symbolRegex.lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = symbolRegex.exec(line)) !== null) {
          result.push(`${fullPath}:${i + 1}:${match.index}`)
          if (result.length >= DEFAULT_MAX_REFERENCES) {
            return result
          }
        }
      }
    }
  }

  return result
}

export async function findReferences(args: FindReferencesArgs): Promise<string> {
  try {
    let fallbackSymbol: string | null = null
    const result = await withLspClient(
      args.filePath,
      async (client) => {
        const includeDeclaration = args.includeDeclaration ?? true
        let references = (await client.references(
          args.filePath,
          args.line,
          args.character,
          includeDeclaration
        )) as Location[] | null

        const isDefaultCursor = args.line === 1 && args.character === 0
        const hasNoReferences = !references || references.length === 0

        if (isDefaultCursor && hasNoReferences) {
          const symbolResult = (await client.documentSymbols(args.filePath)) as
            | DocumentSymbol[]
            | SymbolInfo[]
            | null
          const symbolInfo =
            getFirstSymbolFromDocumentSymbols(symbolResult) ?? getFirstSymbolFromSource(args.filePath)

          if (symbolInfo) {
            fallbackSymbol = symbolInfo.symbol
            references = (await client.references(
              args.filePath,
              symbolInfo.line,
              symbolInfo.character,
              includeDeclaration
            )) as Location[] | null
          }
        }

        return references
      },
      { basePath: args.basePath }
    )

    if ((!result || result.length === 0) && fallbackSymbol) {
      const fallbackRoot = resolve(args.basePath ?? dirname(args.filePath))
      const textReferences = collectTextReferences(fallbackRoot, fallbackSymbol)
      if (textReferences.length > 0) {
        return textReferences.join("\n")
      }
    }

    if (!result || result.length === 0) {
      return "No references found"
    }

    const total = result.length
    const truncated = total > DEFAULT_MAX_REFERENCES
    const limited = truncated ? result.slice(0, DEFAULT_MAX_REFERENCES) : result
    const lines = limited.map(formatLocation)
    if (truncated) {
      lines.unshift(`Found ${total} references (showing first ${DEFAULT_MAX_REFERENCES}):`)
    }
    const output = lines.join("\n")
    return output
  } catch (e) {
    const output = `Error: ${e instanceof Error ? e.message : String(e)}`
    return output
  }
}
