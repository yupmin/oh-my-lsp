import { describe, expect, it } from "vitest"

import { filterDiagnosticsBySeverity, formatPrepareRenameResult } from "../../src/lsp/lsp-formatters"
import type { Diagnostic, Range } from "../../src/lsp/types"

const range: Range = {
  start: { line: 2, character: 4 },
  end: { line: 2, character: 10 },
}

describe("formatPrepareRenameResult", () => {
  it("formats rename range with placeholder", () => {
    const output = formatPrepareRenameResult({
      range,
      placeholder: "greet",
    })

    expect(output).toBe('Rename available at 3:4-3:10 (current: "greet")')
  })

  it("formats default behavior response", () => {
    expect(formatPrepareRenameResult({ defaultBehavior: true })).toBe(
      "Rename supported (using default behavior)"
    )
  })
})

describe("filterDiagnosticsBySeverity", () => {
  it("filters only error diagnostics", () => {
    const diagnostics: Diagnostic[] = [
      { range, severity: 1, message: "error" },
      { range, severity: 2, message: "warning" },
      { range, severity: 3, message: "info" },
    ]

    const result = filterDiagnosticsBySeverity(diagnostics, "error")
    expect(result).toHaveLength(1)
    expect(result[0].message).toBe("error")
  })
})
