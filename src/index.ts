#!/usr/bin/env node
import { Command } from "commander"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { lspManager } from "./lsp/client"
import { gotoDefinition } from "./commands/goto-definition-command"
import { findReferences } from "./commands/find-references-command"
import { symbols } from "./commands/symbols-command"
import { prepareRename, rename } from "./commands/rename-command"
import {
  diagnostics,
  type DiagnosticSeverityFilter,
} from "./commands/diagnostics-command"
import { astGrepReplace, astGrepSearch } from "./commands/ast-grep-command"
import { CLI_LANGUAGES, DEFAULT_TIMEOUT_MS } from "./ast-grep/constants"
import type { CliLanguage } from "./ast-grep/types"

type RuntimeOptions = {
  timeout: number
  verbose: boolean
  basePath?: string
}

function parseLine(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("line must be an integer >= 0 (0-based)")
  }
  return parsed
}

function parseCharacter(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("character must be an integer >= 0 (0-based)")
  }
  return parsed
}

function parseLimit(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("limit must be an integer >= 1")
  }
  return parsed
}

function parseTimeout(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("timeout must be an integer >= 1")
  }
  return parsed
}

function parseBasePath(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error("base-path must not be empty")
  }
  return trimmed
}

function parseScope(value: string): "document" | "workspace" {
  if (value !== "document" && value !== "workspace") {
    throw new Error("scope must be 'document' or 'workspace'")
  }
  return value
}

function parseSeverity(value: string): DiagnosticSeverityFilter {
  if (
    value !== "error" &&
    value !== "warning" &&
    value !== "information" &&
    value !== "hint" &&
    value !== "all"
  ) {
    throw new Error("severity must be one of: error, warning, information, hint, all")
  }
  return value
}

function parseContext(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("context must be an integer >= 0")
  }
  return parsed
}

function parseLanguage(value: string): CliLanguage {
  if (!(CLI_LANGUAGES as readonly string[]).includes(value)) {
    throw new Error(`lang must be one of: ${CLI_LANGUAGES.join(", ")}`)
  }
  return value as CliLanguage
}

function toOneBasedLine(lineZeroBased: number): number {
  return lineZeroBased + 1
}

function loadCliVersion(): string {
  try {
    const packageJsonPath = resolve(__dirname, "..", "package.json")
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown }
    if (typeof packageJson.version === "string" && packageJson.version.trim()) {
      return packageJson.version
    }
  } catch {}
  return "0.0.0"
}

function applyRuntimeOptions(options: RuntimeOptions): void {
  process.env.OH_MY_LSP_TIMEOUT_MS = String(options.timeout)
  if (options.verbose) {
    process.env.OH_MY_LSP_VERBOSE = "1"
  } else {
    delete process.env.OH_MY_LSP_VERBOSE
  }
}

function printResult(output: string): void {
  process.stdout.write(`${output}\n`)
  if (output.startsWith("Error:")) {
    process.exitCode = 1
  }
}

async function runAndPrint(fn: () => Promise<string>): Promise<void> {
  try {
    const output = await fn()
    printResult(output)
  } finally {
    await lspManager.stopAll().catch(() => {})
  }
}

const program = new Command()

program
  .name("oh-my-lsp")
  .description("LSP CLI ported from oh-my-opencode tools")
  .version(loadCliVersion())

program
  .command("goto_definition")
  .description("Jump to symbol definition. Find WHERE something is defined.")
  .argument("<file-path>", "Target file path")
  .argument("<line>", "0-based line", parseLine)
  .argument("<character>", "0-based character", parseCharacter)
  .option("--timeout <ms>", "LSP request timeout in milliseconds", parseTimeout, 60000)
  .option("--base-path <base-path>", "Base path used as LSP workspace root", parseBasePath)
  .option("--verbose", "Enable verbose runtime logging")
  .action(async (filePath: string, line: number, character: number, options: RuntimeOptions) => {
    applyRuntimeOptions(options)
    await runAndPrint(
      () =>
        gotoDefinition({
          filePath,
          line: toOneBasedLine(line),
          character,
          basePath: options.basePath,
        })
    )
  })

program
  .command("find_references")
  .description("Find ALL usages/references of a symbol across the entire workspace.")
  .argument("<file-path>", "Target file path")
  .argument("<line>", "0-based line", parseLine)
  .argument("<character>", "0-based character", parseCharacter)
  .option("--timeout <ms>", "LSP request timeout in milliseconds", parseTimeout, 60000)
  .option("--base-path <base-path>", "Base path used as LSP workspace root", parseBasePath)
  .option("--verbose", "Enable verbose runtime logging")
  .option("--no-include-declaration", "Exclude the declaration itself")
  .action(
    async (
      filePath: string,
      line: number,
      character: number,
      options: RuntimeOptions & { includeDeclaration: boolean }
    ) => {
      applyRuntimeOptions(options)
      await runAndPrint(
        () =>
          findReferences({
            filePath,
            line: toOneBasedLine(line),
            character,
            includeDeclaration: options.includeDeclaration,
            basePath: options.basePath,
          })
      )
    }
  )

program
  .command("symbols")
  .description("Get document symbols or search workspace symbols.")
  .argument("<file-path>", "File path for LSP context")
  .option("--scope <scope>", "document|workspace", parseScope, "document")
  .option("--query <query>", "Symbol name to search (required for workspace scope)")
  .option("--limit <limit>", "Max results (default 200)", parseLimit)
  .option("--timeout <ms>", "LSP request timeout in milliseconds", parseTimeout, 60000)
  .option("--base-path <base-path>", "Base path used as LSP workspace root", parseBasePath)
  .option("--verbose", "Enable verbose runtime logging")
  .action(
    async (
      filePath: string,
      options: RuntimeOptions & { scope: "document" | "workspace"; query?: string; limit?: number }
    ) => {
      applyRuntimeOptions(options)
      await runAndPrint(
        () =>
          symbols({
            filePath,
            scope: options.scope,
            query: options.query,
            limit: options.limit,
            basePath: options.basePath,
          })
      )
    }
  )

program
  .command("diagnostics")
  .description("Get errors, warnings, hints from language server BEFORE running build.")
  .argument("<file-path>", "Target file path")
  .option("--severity <severity>", "error|warning|information|hint|all", parseSeverity)
  .option("--timeout <ms>", "LSP request timeout in milliseconds", parseTimeout, 60000)
  .option("--base-path <base-path>", "Base path used as LSP workspace root", parseBasePath)
  .option("--verbose", "Enable verbose runtime logging")
  .action(
    async (
      filePath: string,
      options: RuntimeOptions & { severity?: DiagnosticSeverityFilter }
    ) => {
      applyRuntimeOptions(options)
      await runAndPrint(
        () =>
          diagnostics({
            filePath,
            severity: options.severity,
            basePath: options.basePath,
          })
      )
    }
  )

program
  .command("prepare_rename")
  .description("Check if rename is valid. Use BEFORE rename.")
  .argument("<file-path>", "Target file path")
  .argument("<line>", "0-based line", parseLine)
  .argument("<character>", "0-based character", parseCharacter)
  .option("--timeout <ms>", "LSP request timeout in milliseconds", parseTimeout, 60000)
  .option("--base-path <base-path>", "Base path used as LSP workspace root", parseBasePath)
  .option("--verbose", "Enable verbose runtime logging")
  .action(async (filePath: string, line: number, character: number, options: RuntimeOptions) => {
    applyRuntimeOptions(options)
    await runAndPrint(
      () =>
        prepareRename({
          filePath,
          line: toOneBasedLine(line),
          character,
          basePath: options.basePath,
        })
    )
  })

program
  .command("rename")
  .description("Rename symbol across entire workspace. APPLIES changes to all files.")
  .argument("<file-path>", "Target file path")
  .argument("<new-name>", "New symbol name")
  .argument("<line>", "0-based line", parseLine)
  .argument("<character>", "0-based character", parseCharacter)
  .option("--timeout <ms>", "LSP request timeout in milliseconds", parseTimeout, 60000)
  .option("--base-path <base-path>", "Base path used as LSP workspace root", parseBasePath)
  .option("--verbose", "Enable verbose runtime logging")
  .action(async (filePath: string, newName: string, line: number, character: number, options: RuntimeOptions) => {
    applyRuntimeOptions(options)
    await runAndPrint(
      () =>
        rename({
          filePath,
          line: toOneBasedLine(line),
          character,
          newName,
          basePath: options.basePath,
        })
    )
  })

program
  .command("ast_grep_search")
  .description("AST-aware code pattern search (25 languages).")
  .argument("<lang>", `Target language (${CLI_LANGUAGES.join(", ")})`)
  .argument("<pattern>", "AST pattern with meta-variables ($VAR, $$$)")
  .option("--paths <paths...>", "Paths to search (default: current directory)")
  .option("--globs <globs...>", "Include/exclude globs (prefix ! to exclude)")
  .option("--context <lines>", "Context lines around each match", parseContext)
  .option("--timeout <ms>", "ast-grep command timeout in milliseconds", parseTimeout, DEFAULT_TIMEOUT_MS)
  .option("--verbose", "Enable verbose runtime logging")
  .action(
    async (
      lang: string,
      pattern: string,
      options: RuntimeOptions & {
        paths?: string[]
        globs?: string[]
        context?: number
      }
    ) => {
      applyRuntimeOptions(options)
      await runAndPrint(
        () =>
          astGrepSearch({
            pattern,
            lang: parseLanguage(lang),
            paths: options.paths,
            globs: options.globs,
            context: options.context,
            timeoutMs: options.timeout,
          })
      )
    }
  )

program
  .command("ast_grep_replace")
  .description("AST-aware code replacement.")
  .argument("<lang>", `Target language (${CLI_LANGUAGES.join(", ")})`)
  .argument("<pattern>", "AST pattern to match")
  .argument("<rewrite>", "Replacement pattern (supports meta-variables)")
  .option("--paths <paths...>", "Paths to search (default: current directory)")
  .option("--globs <globs...>", "Include/exclude globs (prefix ! to exclude)")
  .option("--no-dry-run", "Apply changes to files (default is dry-run preview)")
  .option("--timeout <ms>", "ast-grep command timeout in milliseconds", parseTimeout, DEFAULT_TIMEOUT_MS)
  .option("--verbose", "Enable verbose runtime logging")
  .action(
    async (
      lang: string,
      pattern: string,
      rewrite: string,
      options: RuntimeOptions & {
        paths?: string[]
        globs?: string[]
        dryRun: boolean
      }
    ) => {
      applyRuntimeOptions(options)
      await runAndPrint(
        () =>
          astGrepReplace({
            pattern,
            rewrite,
            lang: parseLanguage(lang),
            paths: options.paths,
            globs: options.globs,
            dryRun: options.dryRun,
            timeoutMs: options.timeout,
          })
      )
    }
  )

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`Error: ${message}\n`)
  process.exitCode = 1
})
