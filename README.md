# oh-my-lsp CLI

[![CI](https://github.com/yupmin/oh-my-lsp/actions/workflows/ci.yml/badge.svg)](https://github.com/yupmin/oh-my-lsp/actions/workflows/ci.yml)
![NPM Version](https://img.shields.io/npm/v/oh-my-lsp)

Built by referencing `oh-my-opencode`'s [`src/tools/ast-grep`](https://github.com/code-yeongyu/oh-my-opencode/dev/src/tools/ast-grep), [`src/tools/lsp`](https://github.com/code-yeongyu/oh-my-opencode/dev/src/tools/lsp).

## Prerequisites

`oh-my-lsp` does **not** bundle language servers or ast-grep. You must install them separately.

### ast-grep (required for `ast_grep_search` / `ast_grep_replace`)

```bash
npm install -g @ast-grep/cli
# or
cargo install ast-grep --locked
# or
brew install ast-grep
```

### LSP Servers (required for LSP commands)

Install the server for each language you need:

| Language | Install |
|----------|---------|
| TypeScript/JS | `npm install -g typescript-language-server typescript` |
| Python | `pip install basedpyright` or `pip install pyright` |
| Go | `go install golang.org/x/tools/gopls@latest` |
| Rust | `rustup component add rust-analyzer` |
| Java | See [eclipse.jdt.ls](https://github.com/eclipse-jdtls/eclipse.jdt.ls) |
| C/C++ | See [clangd](https://clangd.llvm.org/installation) |
| Ruby | `gem install ruby-lsp` |
| PHP | `npm install -g intelephense` |
| Bash | `npm install -g bash-language-server` (also install `shellcheck` for diagnostics) |
| Kotlin | See [kotlin-lsp](https://github.com/Kotlin/kotlin-lsp) |
| C# | `dotnet tool install -g csharp-ls` |
| Lua | See [lua-language-server](https://github.com/LuaLS/lua-language-server) |
| YAML | `npm install -g yaml-language-server` |
| Dockerfile | `npm install -g dockerfile-language-server-nodejs` |
| CSS/HTML | `npm install -g @biomejs/biome` |
| Vue | `npm install -g @vue/language-server` |
| Svelte | `npm install -g svelte-language-server` |
| Elixir | See [elixir-ls](https://github.com/elixir-lsp/elixir-ls) |
| Haskell | `ghcup install hls` |

> For the full list of built-in servers and install hints, see [`src/lsp/server-definitions.ts`](src/lsp/server-definitions.ts).

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

### Claude Code Plugin

Install `oh-my-lsp` as a Claude Code plugin so the AI agent automatically uses LSP and AST-grep commands for code navigation and refactoring.

#### 1. Add the marketplace

```bash
claude plugin marketplace add https://github.com/yupmin/oh-my-lsp.git
```

#### 2. Install the plugin

```bash
claude plugin install oh-my-lsp
```

#### 3. Restart Claude Code

The `oh-my-lsp` skill will appear in the available skills list. Claude will automatically use it when you ask to find definitions, references, rename symbols, check diagnostics, or search/replace code patterns.

### For Other AI Agents

If you are using `oh-my-lsp` with other AI coding agents (e.g. Cursor, Windsurf), add the following to your project's `CLAUDE.md` or `AGENTS.md`:

```markdown
## When Does `oh-my-lsp` Skill Apply?

The `oh-my-lsp` skill **MUST** be activated when the task involves any of:
- Finding definitions, references, or symbols
- Inspecting diagnostics (errors/warnings)
- Renaming symbols
- AST-aware pattern search or replace

## Enforcement Rule

If a task involves:
- Semantic symbol operations → LSP commands must be used.
- Structural pattern transformations → AST-Grep must be used.
- Any modification to LSP-supported files → `diagnostics` must run before and after.

Failure to follow these sequences is considered non-compliant.
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

| Language | `symbols` | `diagnostics` | `goto_definition` | `find_references` | `prepare_rename` | `rename` | verify |
|---|---|---|---|---|---|---|---|
| Bash | O | O | O | O | O | O | ✅ |
| C | O | O | O | O | O | O | ✅ |
| C++ | O | O | O | O | O | O | ✅ |
| C# | O | O | O | O | O | O | |
| CSS | X | O | X | X | X | X | ✅ |
| Dockerfile | O | O | X | X | X | X | ✅ |
| Go | O | O | O | O | O | O | |
| Java | O | O | O | O | O | O | ✅ |
| JavaScript | O | O | O | O | O | O | ✅ |
| Kotlin | O | O | O | O | X | O | ✅ |
| Lua | O | O | O | O | O | O | |
| PHP | O | O | O | O | X | X | ✅ |
| Python | O | O | O | O | O | O | ✅ |
| Ruby | O | O | X | O | X | X | ✅ |
| Rust | O | O | O | O | O | O | |
| TypeScript | O | O | O | O | O | O | ✅ |
| YAML | O | O | X | X | X | X | ✅ |

> Bash note: `goto_definition`, `find_references`, `prepare_rename`, and `rename` are supported only within the same file.
>
> CSS note: `symbols` is not supported — biome does not implement `textDocument/documentSymbol` for CSS files.
>
> PHP note: `prepare_rename` and `rename` are not supported — intelephense does not support rename for plain PHP functions.
>
> Ruby note: `goto_definition`, `prepare_rename`, and `rename` are not supported — ruby-lsp requires a full Ruby project (Gemfile) to index symbols for definition navigation, and does not support rename for method definitions in standalone files.

### AST-Grep Tools

| Tool | Description |
|------|-------------|
| **ast_grep_search** | AST-aware code pattern search (25 languages) |
| **ast_grep_replace** | AST-aware code replacement |

### `goto_definition`

```bash
oh-my-lsp goto_definition <file-path> <line> <character> [--timeout=60000] [--base-path <path>] [--verbose]
```

- `line`: 0-based (required)
- `character`: 0-based (required)

### `find_references`

```bash
oh-my-lsp find_references <file-path> <line> <character> [--timeout=60000] [--base-path <path>] [--verbose] [--no-include-declaration]
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
oh-my-lsp prepare_rename <file-path> <line> <character> [--timeout=60000] [--base-path <path>] [--verbose]
```

### `rename`

```bash
oh-my-lsp rename <file-path> <new-name> <line> <character> [--timeout=60000] [--base-path <path>] [--verbose]
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

MIT License - see LICENSE file for details
