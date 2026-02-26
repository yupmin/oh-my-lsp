import { describe, expect, it } from "vitest"

import { BUILTIN_SERVERS } from "../../src/lsp/server-definitions"

describe("BUILTIN_SERVERS", () => {
  it("runs kotlin-ls in stdio mode", () => {
    expect(BUILTIN_SERVERS["kotlin-ls"]).toMatchObject({
      command: ["kotlin-lsp", "--stdio"],
      extensions: [".kt", ".kts"],
    })
  })
})
