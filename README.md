# oh-my-lsp CLI

`commander.js` 기반 TypeScript LSP CLI입니다.  
`oh-my-opencode`의 `src/tools/lsp` 핵심 로직을 CLI 형태로 포팅했습니다.

## 시작하기

```bash
npm install
```

## 개발 실행

```bash
npm run dev -- --help
```

## 빌드 / 실행

```bash
npm run build
npm run start -- --help
```

## 전역 링크(선택)

```bash
npm link
oh-my-lsp --help
```

## 명령어

기본 형태:

```bash
oh-my-lsp <command> <file-path> ...
```

### `goto_definition`

```bash
oh-my-lsp goto_definition <file-path> [--line=0] [--character=0] [--timeout=60000] [--verbose]
```

- `line`: 0-based
- `character`: 0-based

### `find_references`

```bash
oh-my-lsp find_references <file-path> [--line=0] [--character=0] [--timeout=60000] [--verbose] [--no-include-declaration]
```

- 기본값은 declaration 포함(`includeDeclaration=true`)
- `--no-include-declaration` 사용 시 declaration 제외

### `symbols`

```bash
oh-my-lsp symbols <file-path> [--scope document|workspace] [--query <query>] [--limit <n>] [--timeout=60000] [--verbose]
```

- `--scope workspace`일 때는 `--query` 필수

### `diagnostics`

```bash
oh-my-lsp diagnostics <file-path> [--severity error|warning|information|hint|all] [--timeout=60000] [--verbose]
```

### `prepare_rename`

```bash
oh-my-lsp prepare_rename <file-path> [--line=0] [--character=0] [--timeout=60000] [--verbose]
```

### `rename`

```bash
oh-my-lsp rename <file-path> <new-name> [--line=0] [--character=0] [--timeout=60000] [--verbose]
```
