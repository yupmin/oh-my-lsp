import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockGetMergedServers,
  mockLoadAllConfigs,
  mockGetConfigPaths,
  mockIsServerInstalled,
} = vi.hoisted(() => ({
  mockGetMergedServers: vi.fn(),
  mockLoadAllConfigs: vi.fn(),
  mockGetConfigPaths: vi.fn(),
  mockIsServerInstalled: vi.fn(),
}))

vi.mock("../src/lsp/server-config-loader", () => ({
  getMergedServers: mockGetMergedServers,
  loadAllConfigs: mockLoadAllConfigs,
  getConfigPaths: mockGetConfigPaths,
}))

vi.mock("../src/lsp/server-installation", () => ({
  isServerInstalled: mockIsServerInstalled,
}))

import { findServerForExtension, getAllServers, getConfigPaths_ } from "../src/lsp/server-resolution"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("findServerForExtension", () => {
  it("returns found when installed server matches extension", () => {
    mockGetMergedServers.mockReturnValue([
      {
        id: "typescript",
        command: ["typescript-language-server", "--stdio"],
        extensions: [".ts"],
        priority: 10,
        source: "project",
      },
    ])
    mockIsServerInstalled.mockReturnValue(true)

    const result = findServerForExtension(".ts")
    expect(result.status).toBe("found")
    if (result.status === "found") {
      expect(result.server.id).toBe("typescript")
    }
  })

  it("returns not_installed when matching server exists but is not installed", () => {
    mockGetMergedServers.mockReturnValue([
      {
        id: "typescript",
        command: ["typescript-language-server", "--stdio"],
        extensions: [".ts"],
        priority: 10,
        source: "project",
      },
    ])
    mockIsServerInstalled.mockReturnValue(false)

    const result = findServerForExtension(".ts")
    expect(result.status).toBe("not_installed")
    if (result.status === "not_installed") {
      expect(result.server.id).toBe("typescript")
      expect(result.installHint).toContain("typescript-language-server")
    }
  })

  it("returns not_configured when no server supports extension", () => {
    mockGetMergedServers.mockReturnValue([
      {
        id: "pyright",
        command: ["pyright-langserver", "--stdio"],
        extensions: [".py"],
        priority: 10,
        source: "project",
      },
    ])
    mockIsServerInstalled.mockReturnValue(true)

    const result = findServerForExtension(".ts")
    expect(result.status).toBe("not_configured")
    if (result.status === "not_configured") {
      expect(result.extension).toBe(".ts")
      expect(result.availableServers).toContain("pyright")
    }
  })
})

describe("getAllServers", () => {
  it("includes active merged servers and disabled servers", () => {
    mockLoadAllConfigs.mockReturnValue(
      new Map([
        [
          "project",
          {
            lsp: {
              typescript: { disabled: true },
            },
          },
        ],
      ])
    )

    mockGetMergedServers.mockReturnValue([
      {
        id: "pyright",
        command: ["pyright-langserver", "--stdio"],
        extensions: [".py"],
        priority: 5,
        source: "project",
      },
    ])

    mockIsServerInstalled.mockImplementation((command: string[]) => command[0] === "pyright-langserver")

    const result = getAllServers()

    expect(result.find((s) => s.id === "pyright")?.disabled).toBe(false)
    expect(result.find((s) => s.id === "typescript")?.disabled).toBe(true)
  })
})

describe("getConfigPaths_", () => {
  it("delegates to getConfigPaths", () => {
    const expected = {
      project: "/tmp/project.json",
      user: "/tmp/user.json",
      opencode: "/tmp/opencode.json",
    }
    mockGetConfigPaths.mockReturnValue(expected)

    expect(getConfigPaths_()).toEqual(expected)
  })
})
