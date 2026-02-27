import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock homedir so tests don't depend on the real ~/.m2 / ~/.gradle
const mockHomeDir = vi.fn()
vi.mock("node:os", async (importOriginal) => {
  const orig = await importOriginal<typeof import("node:os")>()
  return { ...orig, homedir: () => mockHomeDir() }
})

import { detectLombokJar, detectLombokVersionFromBuildFile } from "../../src/lsp/lombok-detector"

let tmpRoot: string

beforeEach(() => {
  tmpRoot = join(tmpdir(), `lombok-test-${Date.now()}`)
  mkdirSync(tmpRoot, { recursive: true })
  mockHomeDir.mockReturnValue(tmpRoot)
})

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true })
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// detectLombokVersionFromBuildFile
// ---------------------------------------------------------------------------

describe("detectLombokVersionFromBuildFile", () => {
  it("extracts version from pom.xml (artifactId before version)", () => {
    const projectDir = join(tmpRoot, "project")
    mkdirSync(projectDir)
    writeFileSync(
      join(projectDir, "pom.xml"),
      `<project>
        <dependencies>
          <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>1.18.30</version>
          </dependency>
        </dependencies>
      </project>`
    )

    expect(detectLombokVersionFromBuildFile(projectDir)).toBe("1.18.30")
  })

  it("extracts version from build.gradle (implementation notation)", () => {
    const projectDir = join(tmpRoot, "project")
    mkdirSync(projectDir)
    writeFileSync(
      join(projectDir, "build.gradle"),
      `dependencies {
        compileOnly 'org.projectlombok:lombok:1.18.28'
        annotationProcessor 'org.projectlombok:lombok:1.18.28'
      }`
    )

    expect(detectLombokVersionFromBuildFile(projectDir)).toBe("1.18.28")
  })

  it("extracts version from build.gradle.kts (Kotlin DSL)", () => {
    const projectDir = join(tmpRoot, "project")
    mkdirSync(projectDir)
    writeFileSync(
      join(projectDir, "build.gradle.kts"),
      `dependencies {
        compileOnly("org.projectlombok:lombok:1.18.32")
      }`
    )

    expect(detectLombokVersionFromBuildFile(projectDir)).toBe("1.18.32")
  })

  it("returns null when no build file exists", () => {
    const projectDir = join(tmpRoot, "empty-project")
    mkdirSync(projectDir)

    expect(detectLombokVersionFromBuildFile(projectDir)).toBeNull()
  })

  it("returns null when pom.xml has no lombok dependency", () => {
    const projectDir = join(tmpRoot, "project")
    mkdirSync(projectDir)
    writeFileSync(
      join(projectDir, "pom.xml"),
      `<project>
        <dependencies>
          <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-core</artifactId>
            <version>6.0.0</version>
          </dependency>
        </dependencies>
      </project>`
    )

    expect(detectLombokVersionFromBuildFile(projectDir)).toBeNull()
  })

  it("does NOT capture version from a prior dependency when lombok comes later", () => {
    // Regression: the old beforeArtifact regex would match spring-core's version (6.0.0)
    // instead of returning null, because it matched </dependency> then [\s\S]*? then lombok.
    const projectDir = join(tmpRoot, "project")
    mkdirSync(projectDir)
    writeFileSync(
      join(projectDir, "pom.xml"),
      `<project>
        <dependencies>
          <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-core</artifactId>
            <version>6.0.0</version>
          </dependency>
          <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>1.18.30</version>
          </dependency>
        </dependencies>
      </project>`
    )

    // Must return the correct lombok version, not spring-core's version
    expect(detectLombokVersionFromBuildFile(projectDir)).toBe("1.18.30")
  })
})

// ---------------------------------------------------------------------------
// detectLombokJar — Maven cache
// ---------------------------------------------------------------------------

describe("detectLombokJar — Maven cache", () => {
  function createMavenJar(version: string): string {
    const jarDir = join(tmpRoot, ".m2", "repository", "org", "projectlombok", "lombok", version)
    mkdirSync(jarDir, { recursive: true })
    const jarPath = join(jarDir, `lombok-${version}.jar`)
    writeFileSync(jarPath, "")
    return jarPath
  }

  it("returns the jar when project declares a version present in Maven cache", () => {
    const projectDir = join(tmpRoot, "project")
    mkdirSync(projectDir)
    writeFileSync(
      join(projectDir, "pom.xml"),
      `<project>
        <dependencies>
          <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>1.18.30</version>
          </dependency>
        </dependencies>
      </project>`
    )
    const expectedJar = createMavenJar("1.18.30")

    expect(detectLombokJar(projectDir)).toBe(expectedJar)
  })

  it("falls back to any Maven version when no build file", () => {
    const jarPath = createMavenJar("1.18.28")

    expect(detectLombokJar()).toBe(jarPath)
  })

  it("picks the latest version from Maven when multiple exist", () => {
    createMavenJar("1.18.20")
    createMavenJar("1.18.28")
    const latest = createMavenJar("1.18.30")

    expect(detectLombokJar()).toBe(latest)
  })

  it("picks 1.18.30 over 1.18.9 (numeric sort, not lexicographic)", () => {
    // Regression: lexicographic sort puts "1.18.9" > "1.18.30" because '9' > '3'.
    createMavenJar("1.18.9")
    const latest = createMavenJar("1.18.30")

    expect(detectLombokJar()).toBe(latest)
  })

  it("returns null when Maven cache is empty", () => {
    expect(detectLombokJar()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// detectLombokJar — Gradle cache
// ---------------------------------------------------------------------------

describe("detectLombokJar — Gradle cache", () => {
  function createGradleJar(version: string): string {
    const hashDir = "abc123def456"
    const jarDir = join(
      tmpRoot,
      ".gradle",
      "caches",
      "modules-2",
      "files-2.1",
      "org.projectlombok",
      "lombok",
      version,
      hashDir
    )
    mkdirSync(jarDir, { recursive: true })
    const jarPath = join(jarDir, `lombok-${version}.jar`)
    writeFileSync(jarPath, "")
    return jarPath
  }

  it("returns the jar from Gradle cache when Maven is absent", () => {
    const jarPath = createGradleJar("1.18.28")

    expect(detectLombokJar()).toBe(jarPath)
  })

  it("picks the latest version from Gradle when multiple exist", () => {
    createGradleJar("1.18.20")
    createGradleJar("1.18.28")
    const latest = createGradleJar("1.18.30")

    expect(detectLombokJar()).toBe(latest)
  })

  it("picks 1.18.30 over 1.18.9 in Gradle cache (numeric sort, not lexicographic)", () => {
    createGradleJar("1.18.9")
    const latest = createGradleJar("1.18.30")

    expect(detectLombokJar()).toBe(latest)
  })
})

// ---------------------------------------------------------------------------
// detectLombokJar — priority: Maven over Gradle
// ---------------------------------------------------------------------------

describe("detectLombokJar — priority", () => {
  it("prefers Maven over Gradle when both have the jar", () => {
    // Maven
    const mavenJarDir = join(tmpRoot, ".m2", "repository", "org", "projectlombok", "lombok", "1.18.30")
    mkdirSync(mavenJarDir, { recursive: true })
    const mavenJar = join(mavenJarDir, "lombok-1.18.30.jar")
    writeFileSync(mavenJar, "")

    // Gradle
    const gradleHashDir = join(
      tmpRoot,
      ".gradle",
      "caches",
      "modules-2",
      "files-2.1",
      "org.projectlombok",
      "lombok",
      "1.18.30",
      "abc123"
    )
    mkdirSync(gradleHashDir, { recursive: true })
    writeFileSync(join(gradleHashDir, "lombok-1.18.30.jar"), "")

    expect(detectLombokJar()).toBe(mavenJar)
  })
})
