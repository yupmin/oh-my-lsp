---
name: oh-my-lsp
description: Run and interpret the oh-my-lsp CLI for code navigation, refactoring, and AST-aware search/replace. Use when a user asks to find definitions/references/symbols, inspect diagnostics, rename symbols, or run ast-grep pattern search/replace.
---

# oh-my-lsp

Use this skill to execute `oh-my-lsp` commands reliably and report actionable results.

## For AI Agents

### Working In This Directory

#### LSP Tools Usage

**Basic code intelligence:**
```shell
// Jump to definition
npx oh-my-lsp goto_definition src/index.ts --line 10 --character 15

// Find all usages
npx oh-my-lsp find_references src/index.ts --line 10 --character 15
```

**File/project analysis:**
```shell
// Get file outline (all symbols)
npx oh-my-lsp symbols src/index.ts --scope document

// Search symbols across workspace
npx oh-my-lsp symbols src/index.ts --scope workspace --query createSession

// Single file diagnostics
npx oh-my-lsp diagnostics src/index.ts --severity error
```

**Refactoring support:**
```shell
// Check if rename is valid
npx oh-my-lsp prepare_rename src/index.ts --line 10 --character 15

// Preview rename (does NOT apply changes)
npx oh-my-lsp rename src/index.ts newFunction --line 10 --character 15
```

#### AST Tools Usage

**Pattern search with meta-variables:**
```shell
// Find all function declarations
npx oh-my-lsp ast_grep_search typescript "function $NAME($$$ARGS)" --path src

// Find console.log calls
npx oh-my-lsp ast_grep_search typescript "console.log($MSG)"

// Find if statements
npx oh-my-lsp ast_grep_search typescript "if ($COND) { $$$BODY }"

// Find null checks
npx oh-my-lsp ast_grep_search typescript "$X === null"
```

**AST-aware replacement:**
```shell
// Convert console.log to logger (dry run by default)
npx oh-my-lsp ast_grep_replace typescript "console.log($MSG)" --replacement "logger.info($MSG)"

// Convert var to const
npx oh-my-lsp ast_grep_replace typescript "var $NAME = $VALUE" --replacement "const $NAME = $VALUE" --no-dry-run
```

## Run CLI

1. Run from repo root.
2. Ensure the package is available in the environment.

3. Run commands with:

```bash
npx oh-my-lsp <command> <args...>
```

4. Example:

```bash
npx oh-my-lsp diagnostics src/index.ts
```

5. Prefer explicit workspace root with:

```bash
--base-path <project-root>
```

## Command Usage

- `goto_definition`
  - Use to locate symbol definition.
  - Requires: `<file-path>`
  - Common options: `--line <0-based> --character <0-based> --timeout <ms> --base-path <path>`

- `find_references`
  - Use to locate all symbol usages.
  - Requires: `<file-path>`
  - Common options: `--line <0-based> --character <0-based> --timeout <ms> --base-path <path>`
  - Optional: `--no-include-declaration`

- `symbols`
  - Use to inspect document symbols or workspace symbol search.
  - Requires: `<file-path>`
  - Options: `--scope document|workspace --query <query> --limit <n> --timeout <ms> --base-path <path>`
  - Require `--query` when `--scope workspace`.

- `diagnostics`
  - Use to collect errors/warnings/hints from the language server.
  - Requires: `<file-path>`
  - Options: `--severity error|warning|information|hint|all --timeout <ms> --base-path <path>`

- `prepare_rename`
  - Use to validate rename availability before mutation.
  - Requires: `<file-path>`
  - Options: `--line <0-based> --character <0-based> --timeout <ms> --base-path <path>`

- `rename`
  - Use to apply rename edits across workspace.
  - Requires: `<file-path> <new-name>`
  - Options: `--line <0-based> --character <0-based> --timeout <ms> --base-path <path>`

- `ast_grep_search`
  - Use for AST-aware code pattern search across files.
  - Requires: `<lang> <pattern>`
  - Options: `--paths <path...> --globs <glob...> --context <n> --timeout <ms>`
  - `lang` must be one of:
    - `bash`, `c`, `cpp`, `csharp`, `css`, `elixir`, `go`, `haskell`, `html`, `java`, `javascript`, `json`, `kotlin`, `lua`, `nix`, `php`, `python`, `ruby`, `rust`, `scala`, `solidity`, `swift`, `typescript`, `tsx`, `yaml`
  - Pattern should be a complete AST node and can use meta variables (`$VAR`, `$$$`).

- `ast_grep_replace`
  - Use for AST-aware code replacement.
  - Requires: `<lang> <pattern> <rewrite>`
  - Options: `--paths <path...> --globs <glob...> --no-dry-run --timeout <ms>`
  - Dry-run is default; use `--no-dry-run` to apply edits.

## Recommended Workflow

1. Run `ast_grep_search` before `ast_grep_replace` to preview target locations.
2. Run `ast_grep_replace` with default dry-run first; only use `--no-dry-run` when user requested real edits.
3. Run `diagnostics` first to detect syntax/type blockers.
4. Run `symbols` to inspect document/workspace symbol structure.
5. Run `goto_definition` or `find_references` for navigation.
6. Run `prepare_rename` before `rename`.
7. Run `rename` only after reporting expected file modifications.

## Operational Rules

- Treat `line` and `character` as 0-based input.
- Use `--base-path` whenever project root is known.
- Use `--timeout 60000` for Java (`jdtls`) flows.
- Treat `rename` as mutating; avoid running it on real files unless requested.
- Treat `ast_grep_replace --no-dry-run` as mutating; avoid applying unless explicitly requested.

## Troubleshooting

- If output contains `NOT INSTALLED`, install the missing LSP server binary and ensure it is on `PATH`.
- If output contains `LSP server exited immediately`, report runtime/environment issue (often server runtime/config).
- If output says `No ... found`, retry with corrected cursor (`--line`, `--character`) and explicit `--base-path`.
