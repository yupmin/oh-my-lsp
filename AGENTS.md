# AGENTS.md

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
- Any workspace modification → `diagnostics` must run before and after.

Failure to follow these sequences is considered non-compliant.
