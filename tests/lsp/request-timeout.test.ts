import { afterEach, describe, expect, it } from "vitest"

import { LSPClientTransport } from "../../src/lsp/lsp-client-transport"
import type { ResolvedServer } from "../../src/lsp/types"

class TestTransport extends LSPClientTransport {
  get timeoutMs(): number {
    return this.REQUEST_TIMEOUT
  }
}

const originalTimeout = process.env.OH_MY_LSP_TIMEOUT_MS

function createServer(id: string): ResolvedServer {
  return {
    id,
    command: ["dummy-lsp", "--stdio"],
    extensions: [".tmp"],
    priority: 0,
  }
}

afterEach(() => {
  if (originalTimeout === undefined) {
    delete process.env.OH_MY_LSP_TIMEOUT_MS
    return
  }
  process.env.OH_MY_LSP_TIMEOUT_MS = originalTimeout
})

describe("LSPClientTransport request timeout", () => {
  it("uses 60000ms default for jdtls when timeout env is not set", () => {
    delete process.env.OH_MY_LSP_TIMEOUT_MS

    const transport = new TestTransport("/tmp/project", createServer("jdtls"))
    expect(transport.timeoutMs).toBe(60000)
  })

  it("uses 15000ms default for non-jdtls when timeout env is not set", () => {
    delete process.env.OH_MY_LSP_TIMEOUT_MS

    const transport = new TestTransport("/tmp/project", createServer("typescript"))
    expect(transport.timeoutMs).toBe(15000)
  })

  it("uses explicit timeout env when provided", () => {
    process.env.OH_MY_LSP_TIMEOUT_MS = "42000"

    const javaTransport = new TestTransport("/tmp/project", createServer("jdtls"))
    const tsTransport = new TestTransport("/tmp/project", createServer("typescript"))

    expect(javaTransport.timeoutMs).toBe(42000)
    expect(tsTransport.timeoutMs).toBe(42000)
  })
})
