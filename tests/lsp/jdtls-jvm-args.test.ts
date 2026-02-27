import { mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — must be set up before any imports that transitively use them
// ---------------------------------------------------------------------------

const { mockDetectLombokJar, mockMkdirSync } = vi.hoisted(() => ({
  mockDetectLombokJar: vi.fn<() => string | null>(),
  mockMkdirSync: vi.fn(),
}))

vi.mock("../../src/lsp/lombok-detector", () => ({
  detectLombokJar: mockDetectLombokJar,
}))

// Stub out mkdirSync so tests don't write to the filesystem
vi.mock("node:fs", async (importOriginal) => {
  const orig = await importOriginal<typeof import("node:fs")>()
  return { ...orig, mkdirSync: mockMkdirSync }
})

import { LSPClientTransport } from "../../src/lsp/lsp-client-transport"
import type { ResolvedServer } from "../../src/lsp/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTransport(overrides: Partial<ResolvedServer> = {}): LSPClientTransport {
  const server: ResolvedServer = {
    id: "jdtls",
    command: ["jdtls"],
    extensions: [".java"],
    priority: 0,
    ...overrides,
  }
  return new LSPClientTransport("/tmp/root", server)
}

// Expose the protected method for testing
function resolveCommand(transport: LSPClientTransport, command: string[]): string[] {
  return (transport as unknown as { resolveJdtlsCommand(cmd: string[]): string[] }).resolveJdtlsCommand(command)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockMkdirSync.mockImplementation(() => undefined)
  mockDetectLombokJar.mockReturnValue(null)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("resolveJdtlsCommand — JVM args from config", () => {
  it("appends --jvm-arg for each entry in server.jvmArgs", () => {
    const transport = makeTransport({
      jvmArgs: ["-javaagent:/opt/lombok.jar", "-Xmx2g"],
    })

    const result = resolveCommand(transport, ["jdtls"])

    expect(result).toContain("--jvm-arg=-javaagent:/opt/lombok.jar")
    expect(result).toContain("--jvm-arg=-Xmx2g")
  })

  it("does NOT auto-detect lombok when jvmArgs already contains a lombok agent", () => {
    const transport = makeTransport({
      jvmArgs: ["-javaagent:/opt/lombok.jar"],
    })

    resolveCommand(transport, ["jdtls"])

    expect(mockDetectLombokJar).not.toHaveBeenCalled()
  })

  it("does NOT auto-detect lombok when command already contains a lombok --jvm-arg", () => {
    const transport = makeTransport()

    resolveCommand(transport, ["jdtls", "--jvm-arg=-javaagent:/pre-existing/lombok.jar"])

    expect(mockDetectLombokJar).not.toHaveBeenCalled()
  })
})

describe("resolveJdtlsCommand — auto-detection", () => {
  it("appends lombok --jvm-arg when detectLombokJar returns a path", () => {
    mockDetectLombokJar.mockReturnValue("/home/user/.m2/repository/org/projectlombok/lombok/1.18.30/lombok-1.18.30.jar")

    const transport = makeTransport()
    const result = resolveCommand(transport, ["jdtls"])

    expect(result).toContain(
      "--jvm-arg=-javaagent:/home/user/.m2/repository/org/projectlombok/lombok/1.18.30/lombok-1.18.30.jar"
    )
  })

  it("does NOT append anything when detectLombokJar returns null", () => {
    mockDetectLombokJar.mockReturnValue(null)

    const transport = makeTransport()
    const result = resolveCommand(transport, ["jdtls"])

    expect(result.some((a) => a.includes("lombok"))).toBe(false)
  })

  it("passes the project root to detectLombokJar", () => {
    mockDetectLombokJar.mockReturnValue(null)
    const transport = new LSPClientTransport("/my/project", {
      id: "jdtls",
      command: ["jdtls"],
      extensions: [".java"],
      priority: 0,
    })

    resolveCommand(transport, ["jdtls"])

    expect(mockDetectLombokJar).toHaveBeenCalledWith("/my/project")
  })
})

describe("resolveJdtlsCommand — non-jdtls servers", () => {
  it("returns command unchanged for non-jdtls servers", () => {
    const server: ResolvedServer = {
      id: "typescript",
      command: ["typescript-language-server", "--stdio"],
      extensions: [".ts"],
      priority: 0,
    }
    const transport = new LSPClientTransport("/tmp/root", server)
    const cmd = ["typescript-language-server", "--stdio"]

    expect(resolveCommand(transport, cmd)).toEqual(cmd)
    expect(mockDetectLombokJar).not.toHaveBeenCalled()
  })
})

describe("resolveJdtlsCommand — -data / -configuration flags", () => {
  it("still appends lombok --jvm-arg even when -data and -configuration are pre-supplied", () => {
    mockDetectLombokJar.mockReturnValue("/home/user/.m2/repository/org/projectlombok/lombok/1.18.30/lombok-1.18.30.jar")

    const transport = makeTransport()
    const result = resolveCommand(transport, ["jdtls", "-data", "/tmp/data", "-configuration", "/tmp/config"])

    expect(result).toContain(
      "--jvm-arg=-javaagent:/home/user/.m2/repository/org/projectlombok/lombok/1.18.30/lombok-1.18.30.jar"
    )
  })
})
