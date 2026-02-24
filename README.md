# oh-my-lsp CLI

TypeScript LSP CLI built with `commander.js`.  
It ports the core logic from `oh-my-opencode`'s `src/tools/lsp` into a CLI.

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
oh-my-lsp <command> <file-path> ...
```

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
