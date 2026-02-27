import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

/**
 * Detects lombok.jar path from project build files and local caches.
 *
 * Resolution order:
 * 1. Project pom.xml / build.gradle → exact version → Maven cache → Gradle cache
 * 2. Any version in Maven local repo (~/.m2)
 * 3. Any version in Gradle module cache (~/.gradle/caches)
 *
 * Returns the absolute path to lombok.jar, or null if not found.
 */
export function detectLombokJar(projectRoot?: string): string | null {
  if (projectRoot) {
    const version = detectLombokVersionFromBuildFile(projectRoot)
    if (version) {
      const jar = findLombokJarInMaven(version) ?? findLombokJarInGradle(version)
      if (jar) return jar
    }
  }

  return findLatestLombokJarInMaven() ?? findLatestLombokJarInGradle()
}

/**
 * Parses pom.xml or build.gradle(.kts) to extract the declared lombok version.
 * Exported for testing.
 */
export function detectLombokVersionFromBuildFile(projectRoot: string): string | null {
  const pomPath = join(projectRoot, "pom.xml")
  if (existsSync(pomPath)) {
    try {
      const content = readFileSync(pomPath, "utf-8")
      // Match <artifactId>lombok</artifactId> then <version> within the same block.
      // Only the afterArtifact direction is supported: version-before-artifactId is not
      // standard Maven POM ordering and would require cross-boundary matching that risks
      // capturing the version of an earlier unrelated dependency.
      const afterArtifact = content.match(/<artifactId>lombok<\/artifactId>\s*<version>([^<]+)<\/version>/)
      if (afterArtifact) return afterArtifact[1].trim()
    } catch {
      // ignore unreadable files
    }
  }

  for (const gradleFile of ["build.gradle", "build.gradle.kts"]) {
    const gradlePath = join(projectRoot, gradleFile)
    if (existsSync(gradlePath)) {
      try {
        const content = readFileSync(gradlePath, "utf-8")
        const match = content.match(/org\.projectlombok:lombok:([0-9][^\s"':]+)/)
        if (match) return match[1].trim()
      } catch {
        // ignore
      }
    }
  }

  return null
}

function findLombokJarInMaven(version: string): string | null {
  const jarPath = join(homedir(), ".m2", "repository", "org", "projectlombok", "lombok", version, `lombok-${version}.jar`)
  return existsSync(jarPath) ? jarPath : null
}

function findLatestLombokJarInMaven(): string | null {
  const lombokDir = join(homedir(), ".m2", "repository", "org", "projectlombok", "lombok")
  if (!existsSync(lombokDir)) return null

  try {
    const versions = readdirSync(lombokDir)
      .filter((v) => /^\d+\.\d+/.test(v))
      .sort(compareVersionsDesc)
    for (const version of versions) {
      const jar = findLombokJarInMaven(version)
      if (jar) return jar
    }
  } catch {
    // ignore
  }

  return null
}

function findLombokJarInGradle(version: string): string | null {
  const versionDir = join(
    homedir(),
    ".gradle",
    "caches",
    "modules-2",
    "files-2.1",
    "org.projectlombok",
    "lombok",
    version
  )
  if (!existsSync(versionDir)) return null

  try {
    for (const hashDir of readdirSync(versionDir)) {
      const jarPath = join(versionDir, hashDir, `lombok-${version}.jar`)
      if (existsSync(jarPath)) return jarPath
    }
  } catch {
    // ignore
  }

  return null
}

function findLatestLombokJarInGradle(): string | null {
  const lombokDir = join(
    homedir(),
    ".gradle",
    "caches",
    "modules-2",
    "files-2.1",
    "org.projectlombok",
    "lombok"
  )
  if (!existsSync(lombokDir)) return null

  try {
    const versions = readdirSync(lombokDir)
      .filter((v) => /^\d+\.\d+/.test(v))
      .sort(compareVersionsDesc)
    for (const version of versions) {
      const jar = findLombokJarInGradle(version)
      if (jar) return jar
    }
  } catch {
    // ignore
  }

  return null
}

/** Sorts version strings in descending numeric order (e.g. 1.18.30 > 1.18.9). */
function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}
