# oh-my-lsp CLI

Built by referencing `oh-my-opencode`'s [`src/tools/ast-grep`](https://github.com/code-yeongyu/oh-my-opencode/dev/src/tools/ast-grep), [`src/tools/lsp`](https://github.com/code-yeongyu/oh-my-opencode/dev/src/tools/lsp).

## Getting Started

```bash
npm install oh-my-lsp
```

Run directly:

```bash
npx oh-my-lsp diagnostics src/index.ts
```

## Run in Development

```bash
npm run dev -- --help
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Commands

Basic format:

```bash
oh-my-lsp <command> <args...>
```

### LSP Tools (IDE Features for Agents)

| Tool | Description |
|------|-------------|
| **diagnostics** | Get errors/warnings before build |
| **prepare_rename** | Validate rename operation |
| **rename** | Rename symbol across workspace |
| **goto_definition** | Jump to symbol definition |
| **find_references** | Find all usages across workspace |
| **symbols** | Get file outline or workspace symbol search |

### Language-specific LSP Command Coverage

| Language | `symbols` | `diagnostics` | `goto_definition` | `find_references` | `prepare_rename` | `rename` |
|---|---|---|---|---|---|---|
| Bash | O | O | O | O | O | O |
| C | O | O | O | O | O | O |
| C++ | O | O | O | O | O | O |
| C# | O | O | O | O | O | O |
| CSS | O | O | X | X | X | X |
| Dockerfile | O | O | X | X | X | X |
| Go | O | O | O | O | O | O |
| Java | O | O | O | O | O | O |
| JavaScript | O | O | O | O | O | O |
| Kotlin | O | O | O | X | X | O |
| Lua | O | O | O | O | O | O |
| PHP | O | O | O | O | O | O |
| Python | O | O | O | O | O | O |
| Ruby | O | O | O | O | O | O |
| Rust | O | O | O | O | O | O |
| TypeScript | O | O | O | O | O | O |
| YAML | O | O | X | X | X | X |

> Bash note: `goto_definition`, `find_references`, `prepare_rename`, and `rename` are supported only within the same file.

### AST-Grep Tools

| Tool | Description |
|------|-------------|
| **ast_grep_search** | AST-aware code pattern search (25 languages) |
| **ast_grep_replace** | AST-aware code replacement |

### `goto_definition`

```bash
oh-my-lsp goto_definition <file-path> [--line=0] [--character=0] [--timeout=60000] [--base-path <path>] [--verbose]
```

- `line`: 0-based
- `character`: 0-based

### `find_references`

```bash
oh-my-lsp find_references <file-path> [--line=0] [--character=0] [--timeout=60000] [--base-path <path>] [--verbose] [--no-include-declaration]
```

- Includes declaration by default (`includeDeclaration=true`)
- Excludes declaration when `--no-include-declaration` is used

### `symbols`

```bash
oh-my-lsp symbols <file-path> [--scope document|workspace] [--query <query>] [--limit <n>] [--timeout=60000] [--base-path <path>] [--verbose]
```

- `--query` is required when `--scope workspace`

### `diagnostics`

```bash
oh-my-lsp diagnostics <file-path> [--severity error|warning|information|hint|all] [--timeout=60000] [--base-path <path>] [--verbose]
```

### `prepare_rename`

```bash
oh-my-lsp prepare_rename <file-path> [--line=0] [--character=0] [--timeout=60000] [--base-path <path>] [--verbose]
```

### `rename`

```bash
oh-my-lsp rename <file-path> <new-name> [--line=0] [--character=0] [--timeout=60000] [--base-path <path>] [--verbose]
```

- If `--base-path` is set, that path is used as the LSP server workspace root (`cwd/root`) instead of auto-detecting the workspace root.

### `ast_grep_search`

```bash
oh-my-lsp ast_grep_search <lang> <pattern> [--paths <path1> <path2> ...] [--globs <glob1> <glob2> ...] [--context <n>] [--timeout=300000] [--verbose]
```

- Meta variable examples: `$VAR` (single node), `$$$` (multiple nodes)
- Pattern should be a complete AST node
- Supports 25 languages (`bash`, `c`, `cpp`, `csharp`, `css`, `elixir`, `go`, `haskell`, `html`, `java`, `javascript`, `json`, `kotlin`, `lua`, `nix`, `php`, `python`, `ruby`, `rust`, `scala`, `solidity`, `swift`, `typescript`, `tsx`, `yaml`)

### `ast_grep_replace`

```bash
oh-my-lsp ast_grep_replace <lang> <pattern> <rewrite> [--paths <path1> <path2> ...] [--globs <glob1> <glob2> ...] [--no-dry-run] [--timeout=300000] [--verbose]
```

- Dry-run preview is default
- Use `--no-dry-run` to apply changes to files

## License

[MIT](https://opensource.org/license/mit)
