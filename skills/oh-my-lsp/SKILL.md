---
name: oh-my-lsp
description: Run and interpret the oh-my-lsp CLI for code navigation, refactoring, and AST-aware search/replace. Use when a user asks to find definitions/references/symbols, inspect diagnostics, rename symbols, or run ast-grep pattern search/replace.
---

# oh-my-lsp

Use this skill to execute `oh-my-lsp` commands reliably and report actionable results.

Run: `npx oh-my-lsp <command> <args...>`
Use `--base-path <project-root>` whenever workspace root is known.

## Core Principles

1. **Pattern-based search or bulk transformation → AST-Grep first**
   - Structural code patterns across files, mechanical transformations → `ast_grep_search` / `ast_grep_replace`.
2. **Symbol-based navigation or refactoring → LSP**
   - Semantic precision (definition, references, rename) → LSP commands.
3. **Always run `diagnostics` before and after modifications**
   - Before: establish baseline. After: verify no new errors.
4. **Rename must always follow: `prepare_rename` → `rename`**
   - Never call `rename` without `prepare_rename`.

## Quick Decision Guide

- "Where is this symbol defined?" → `goto_definition`
- "Where is this symbol used?" → `find_references`
- "What symbols exist in this file/workspace?" → `symbols`
- "Is the workspace currently broken?" → `diagnostics`
- "Can I safely rename this?" → `prepare_rename`
- "Rename this symbol everywhere." → `rename`
- "Find this structural code pattern." → `ast_grep_search`
- "Replace this structural pattern." → `ast_grep_replace`

## Required Workflow

**You MUST follow these steps. Do NOT skip ahead.**

### AST workflow

1. **MUST** run `ast_grep_search` first to preview target locations.
2. **MUST** run `ast_grep_replace` with default dry-run to verify rewrites.
3. **ONLY THEN** run `ast_grep_replace --no-dry-run` — and only when user explicitly requests real edits.

### LSP workflow

1. **MUST** run `diagnostics` first to detect syntax/type blockers.
2. **MUST** run `symbols` to obtain the target symbol's exact `line`/`character` position.
3. **MUST** run `goto_definition` with the position from step 2 to reach the definition site.
4. **THEN** run `find_references` with the confirmed position to search usages.
5. **MUST** run `prepare_rename` before `rename`.
6. **ONLY THEN** run `rename` — and only after reporting expected file modifications to the user.

## Command Order by Task Type

### Code Exploration
1. `symbols` → 2. `goto_definition` → 3. `find_references` → 4. `ast_grep_search` (if needed) → 5. `diagnostics` (if issues found)

### Debugging / Error Investigation
1. `diagnostics` → 2. `goto_definition` → 3. `find_references` → 4. `ast_grep_search` (if pattern issue) → 5. Fix → 6. `diagnostics`

### Symbol Rename (LSP)
1. `diagnostics` → 2. `goto_definition` → 3. `find_references` → 4. `prepare_rename` → 5. `rename` → 6. `diagnostics`

### Pattern-Based Bulk Refactoring (AST)
1. `diagnostics` → 2. `ast_grep_search` → 3. Review matches → 4. `ast_grep_replace` → 5. `diagnostics`

### Mixed Refactoring (AST + LSP)
1. `diagnostics` → 2. `ast_grep_search` → 3. `ast_grep_replace` → 4. `find_references` → 5. `prepare_rename` → 6. `rename` → 7. `diagnostics`

## Command Usage

### `goto_definition`

Locate symbol definition.

- Requires: `<file-path>`
- Options: `--line <0-based> --character <0-based> --timeout <ms> --base-path <path>`
- Example: `npx oh-my-lsp goto_definition src/index.ts --line 10 --character 15`

### `find_references`

Locate all symbol usages.

- Requires: `<file-path>`
- Options: `--line <0-based> --character <0-based> --timeout <ms> --base-path <path>`
- Optional: `--no-include-declaration`
- Example: `npx oh-my-lsp find_references src/index.ts --line 10 --character 15`

### `symbols`

Inspect document symbols or workspace symbol search.

- Requires: `<file-path>`
- Options: `--scope document|workspace --query <query> --limit <n> --timeout <ms> --base-path <path>`
- Require `--query` when `--scope workspace`.
- Examples:
  ```shell
  # Get file outline
  npx oh-my-lsp symbols src/index.ts --scope document
  # Search symbols across workspace
  npx oh-my-lsp symbols src/index.ts --scope workspace --query createSession
  ```

### `diagnostics`

Collect errors/warnings/hints from the language server.

- Requires: `<file-path>`
- Options: `--severity error|warning|information|hint|all --timeout <ms> --base-path <path>`
- Example: `npx oh-my-lsp diagnostics src/index.ts --severity error`

### `prepare_rename`

Validate rename availability before mutation.

- Requires: `<file-path>`
- Options: `--line <0-based> --character <0-based> --timeout <ms> --base-path <path>`
- Example: `npx oh-my-lsp prepare_rename src/index.ts --line 10 --character 15`

### `rename`

Apply rename edits across workspace.

- Requires: `<file-path> <new-name>`
- Options: `--line <0-based> --character <0-based> --timeout <ms> --base-path <path>`
- Example: `npx oh-my-lsp rename src/index.ts newFunction --line 10 --character 15`

### `ast_grep_search`

AST-aware code pattern search across files.

- Requires: `<lang> <pattern>`
- Options: `--paths <path...> --globs <glob...> --context <n> --timeout <ms>`
- `lang` must be one of:
  - `bash`, `c`, `cpp`, `csharp`, `css`, `elixir`, `go`, `haskell`, `html`, `java`, `javascript`, `json`, `kotlin`, `lua`, `nix`, `php`, `python`, `ruby`, `rust`, `scala`, `solidity`, `swift`, `typescript`, `tsx`, `yaml`
- Pattern should be a complete AST node and can use meta variables (`$VAR`, `$$$`).
- Examples:
  ```shell
  # Find all function declarations
  npx oh-my-lsp ast_grep_search typescript "function $NAME($$$ARGS)" --paths src
  # Find console.log calls
  npx oh-my-lsp ast_grep_search typescript "console.log($MSG)"
  # Find null checks
  npx oh-my-lsp ast_grep_search typescript "$X === null"
  ```

### `ast_grep_replace`

AST-aware code replacement.

- Requires: `<lang> <pattern> <rewrite>`
- Options: `--paths <path...> --globs <glob...> --no-dry-run --timeout <ms>`
- Dry-run is default; use `--no-dry-run` to apply edits.
- Examples:
  ```shell
  # Convert console.log to logger (dry run by default)
  npx oh-my-lsp ast_grep_replace typescript "console.log($MSG)" "logger.info($MSG)"
  # Convert var to const (apply changes)
  npx oh-my-lsp ast_grep_replace typescript "var $NAME = $VALUE" "const $NAME = $VALUE" --no-dry-run
  ```

## Operational Rules

- **`<file-path>` must be an actual file, NOT a directory.** The tool detects the LSP server from the file extension. Passing a directory (e.g. `src/main/java`) will fail with `No LSP server configured for extension:`.
- **Never guess file paths.** If the exact file path is unknown, run `ast_grep_search` first to locate the symbol. The search result provides the real file path and position, which can then be used as input for LSP commands.
- Treat `line` and `character` as 0-based input.
- Use `--base-path` whenever project root is known.
- Use `--timeout 60000` for Java (`jdtls`) flows.
- Treat `rename` as mutating; avoid running it on real files unless requested.
- Treat `ast_grep_replace --no-dry-run` as mutating; avoid applying unless explicitly requested.

## Troubleshooting

- If output contains `NOT INSTALLED`, install the missing LSP server binary and ensure it is on `PATH`.
- If output contains `LSP server exited immediately`, report runtime/environment issue (often server runtime/config).
- If output says `No ... found`, retry with corrected cursor (`--line`, `--character`) and explicit `--base-path`.
