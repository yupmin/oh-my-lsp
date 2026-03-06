import { rmSync } from "node:fs"
import { afterEach } from "vitest"

/**
 * Tracks temporary directories created during tests and removes them after each test.
 */
export function useTempDirTracker(): { track: (dir: string) => string } {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  return {
    track(dir: string): string {
      tempDirs.push(dir)
      return dir
    },
  }
}
