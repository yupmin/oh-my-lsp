import { describe, expect, it, vi } from "vitest"

import { cleanupTempDirectoryLspClients } from "../src/lsp/lsp-manager-temp-directory-cleanup"

describe("cleanupTempDirectoryLspClients", () => {
  it("removes only idle clients in temp directories", async () => {
    const stopTmpIdle = vi.fn(async () => {})
    const stopTmpBusy = vi.fn(async () => {})
    const stopWorkspaceIdle = vi.fn(async () => {})

    const clients = new Map<string, { refCount: number; client: { stop: () => Promise<void> } }>([
      ["/tmp/project::typescript", { refCount: 0, client: { stop: stopTmpIdle } }],
      ["/tmp/project::pyright", { refCount: 1, client: { stop: stopTmpBusy } }],
      ["/Users/test/work::typescript", { refCount: 0, client: { stop: stopWorkspaceIdle } }],
    ])

    await cleanupTempDirectoryLspClients(clients)

    expect(stopTmpIdle).toHaveBeenCalledTimes(1)
    expect(stopTmpBusy).not.toHaveBeenCalled()
    expect(stopWorkspaceIdle).not.toHaveBeenCalled()
    expect(clients.has("/tmp/project::typescript")).toBe(false)
    expect(clients.has("/tmp/project::pyright")).toBe(true)
    expect(clients.has("/Users/test/work::typescript")).toBe(true)
  })
})
