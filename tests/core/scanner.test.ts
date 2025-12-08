import { describe, it, beforeAll, afterAll, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { scanDirectory } from "../../src/core/scanner.js";

describe("Core: Scanner", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fullsend-scan-test-"));

    // Setup structure
    await fs.mkdir(path.join(tempDir, "src", "utils"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "node_modules"), { recursive: true });

    await fs.writeFile(path.join(tempDir, "src", "index.ts"), "content");
    await fs.writeFile(
      path.join(tempDir, "src", "utils", "helper.ts"),
      "content"
    );
    await fs.writeFile(path.join(tempDir, "node_modules", "bad.ts"), "content");
    await fs.writeFile(path.join(tempDir, ".gitignore"), "ignored.txt");
    await fs.writeFile(path.join(tempDir, "ignored.txt"), "content");
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should find all valid files recursively", async () => {
    const files = await scanDirectory(tempDir, { useGitIgnore: true });
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain(path.join("src", "index.ts"));
    expect(paths).toContain(path.join("src", "utils", "helper.ts"));
  });

  it("should respect ignored directories (node_modules)", async () => {
    const files = await scanDirectory(tempDir, { useGitIgnore: true });
    const paths = files.map((f) => f.relativePath);

    expect(paths).not.toContain(path.join("node_modules", "bad.ts"));
  });

  it("should respect .gitignore patterns", async () => {
    const files = await scanDirectory(tempDir, { useGitIgnore: true });
    const paths = files.map((f) => f.relativePath);

    expect(paths).not.toContain("ignored.txt");
  });

  it("should handle empty directories gracefully", async () => {
    await fs.mkdir(path.join(tempDir, "empty_dir"));
    const files = await scanDirectory(tempDir);
    const emptyDirPath = path.join("empty_dir");

    const found = files.find((f) => f.relativePath === emptyDirPath);
    expect(found).toBeUndefined();
  });
});
