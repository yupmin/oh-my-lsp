import { defineConfig } from "vitest/config"

// CLI integration tests spawn heavy LSP servers (jdtls, rust-analyzer, etc.)
// via spawnSync, which blocks the worker thread event loop. Using the default
// "threads" pool causes Vitest's IPC onTaskUpdate call to time out after
// long-running tests. "forks" runs each test file in an isolated child
// process that exits cleanly when done, avoiding the IPC timeout entirely.
export default defineConfig({
  test: {
    pool: "forks",
    include: ["tests/**/*.test.ts"],
  },
})
