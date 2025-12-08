import { describe, it, beforeAll, afterAll, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createFilter, getIgnorePatterns } from "../../src/core/filter.js";
import { DEFAULT_IGNORE_PATTERNS } from "../../src/config/index.js";

describe("Core: Filter & Ignore", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fullsend-filter-test-"));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should include default ignore patterns", async () => {
    const filter = await createFilter(tempDir, false);
    expect(filter.ignores("node_modules/package.json")).toBe(true);
    expect(filter.ignores(".git/HEAD")).toBe(true);
    expect(filter.ignores("dist/index.js")).toBe(true);
  });

  it("should respect .gitignore files if enabled", async () => {
    await fs.writeFile(path.join(tempDir, ".gitignore"), "secret.txt\n*.log");

    const filter = await createFilter(tempDir, true);
    expect(filter.ignores("secret.txt")).toBe(true);
    expect(filter.ignores("error.log")).toBe(true);
    expect(filter.ignores("normal.txt")).toBe(false);
  });

  it("should respect .fullsendignore files (priority over defaults)", async () => {
    await fs.writeFile(
      path.join(tempDir, ".fullsendignore"),
      "generated/\ncustom.conf"
    );

    const filter = await createFilter(tempDir, true);
    expect(filter.ignores("generated/file.ts")).toBe(true);
    expect(filter.ignores("custom.conf")).toBe(true);
  });

  it("should ignore comments and empty lines in ignore files", async () => {
    await fs.writeFile(
      path.join(tempDir, ".fullsendignore"),
      "\n# This is a comment\n   \nfile.txt"
    );
    const patterns = await getIgnorePatterns(tempDir, false);

    expect(patterns).not.toContain("# This is a comment");
    expect(patterns).toContain("file.txt");
  });

  it("should fall back to defaults if ignore files are missing", async () => {
    const emptyDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "fullsend-empty-")
    );
    const patterns = await getIgnorePatterns(emptyDir, true);

    expect(patterns.length).toBeGreaterThanOrEqual(
      DEFAULT_IGNORE_PATTERNS.length
    );
    await fs.rm(emptyDir, { recursive: true });
  });
});
