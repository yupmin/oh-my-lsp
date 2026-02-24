import { describe, expect, it } from "vitest"

import { getLanguageId } from "../src/lsp/language-config"

describe("getLanguageId", () => {
  it("returns mapped language id for known extension", () => {
    expect(getLanguageId(".ts")).toBe("typescript")
    expect(getLanguageId(".tsx")).toBe("typescriptreact")
  })

  it("returns plaintext for unknown extension", () => {
    expect(getLanguageId(".unknown-ext")).toBe("plaintext")
  })
})
