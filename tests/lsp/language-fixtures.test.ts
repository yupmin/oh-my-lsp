import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { getLanguageId } from "../../src/lsp/language-config"
import { BUILTIN_SERVERS } from "../../src/lsp/server-definitions"

const fixtureDir = join(process.cwd(), "tests", "fixtures")

const languageCases = [
  {
    folder: "typescript",
    sampleFile: "sample.ts",
    diagnosticsFailFile: "diagnostics_fail.ts",
    extension: ".ts",
    expectedLanguage: "typescript",
  },
  {
    folder: "javascript",
    sampleFile: "sample.js",
    diagnosticsFailFile: "diagnostics_fail.js",
    extension: ".js",
    expectedLanguage: "javascript",
  },
  {
    folder: "python",
    sampleFile: "sample.py",
    diagnosticsFailFile: "diagnostics_fail.py",
    extension: ".py",
    expectedLanguage: "python",
  },
  {
    folder: "php",
    sampleFile: "sample.php",
    diagnosticsFailFile: "diagnostics_fail.php",
    extension: ".php",
    expectedLanguage: "php",
  },
  {
    folder: "java",
    sampleFile: "Sample.java",
    diagnosticsFailFile: "DiagnosticsFail.java",
    extension: ".java",
    expectedLanguage: "java",
  },
  {
    folder: "ruby",
    sampleFile: "sample.rb",
    diagnosticsFailFile: "diagnostics_fail.rb",
    extension: ".rb",
    expectedLanguage: "ruby",
  },
] as const

describe("language fixtures", () => {
  it("contains sample files for each language folder", () => {
    for (const item of languageCases) {
      expect(existsSync(join(fixtureDir, item.folder, item.sampleFile))).toBe(true)
    }
  })

  it("contains diagnostics failure files for each language folder", () => {
    for (const item of languageCases) {
      expect(existsSync(join(fixtureDir, item.folder, item.diagnosticsFailFile))).toBe(true)
    }
  })

  it("maps each fixture extension to expected language id", () => {
    for (const item of languageCases) {
      expect(getLanguageId(item.extension)).toBe(item.expectedLanguage)
    }
  })

  it("has at least one builtin LSP server supporting each fixture extension", () => {
    for (const item of languageCases) {
      const hasServer = Object.values(BUILTIN_SERVERS).some((server) =>
        server.extensions.includes(item.extension)
      )
      expect(hasServer).toBe(true)
    }
  })
})
