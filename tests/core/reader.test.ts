import { describe, it, beforeAll, afterAll, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { readFiles } from "../../src/core/reader.js";
import type { FullsendFile } from "../../src/types.js";

describe("Core: Reader", () => {
  let tempDir: string;
  const MB = 1024 * 1024;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fullsend-reader-test-"));
    await fs.writeFile(path.join(tempDir, "normal.txt"), "hello");
    await fs.writeFile(path.join(tempDir, "large.txt"), "A".repeat(MB + 100));

    // Create a binary file (contains null byte)
    const buffer = Buffer.from([0x68, 0x65, 0x00, 0x6c, 0x6c, 0x6f]); // he\0llo
    await fs.writeFile(path.join(tempDir, "binary.bin"), buffer);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  function makeFileObj(name: string, size: number): FullsendFile {
    return {
      path: path.join(tempDir, name),
      relativePath: name,
      size: size,
    };
  }

  it("should load valid text files", async () => {
    const files = [makeFileObj("normal.txt", 5)];
    const result = await readFiles(files, {
      maxFileSize: MB * 5,
      concurrency: 1,
    });

    expect(result.loadedFiles).toHaveLength(1);
    expect(result.loadedFiles[0].content).toBe("hello");
  });

  it("should skip files exceeding max size", async () => {
    const files = [makeFileObj("large.txt", MB + 100)];
    // Set limit to 1MB
    const result = await readFiles(files, { maxFileSize: MB, concurrency: 1 });

    expect(result.loadedFiles).toHaveLength(0);
    expect(result.skippedFiles).toHaveLength(1);
    expect(result.skippedFiles[0].relativePath).toBe("large.txt");
  });

  it("should skip binary files (containing null bytes)", async () => {
    const files = [makeFileObj("binary.bin", 6)];
    const result = await readFiles(files, { maxFileSize: MB, concurrency: 1 });

    expect(result.loadedFiles).toHaveLength(0);
    expect(result.skippedFiles).toHaveLength(1);
    expect(result.skippedFiles[0].relativePath).toBe("binary.bin");
  });

  it("should handle read errors gracefully", async () => {
    const files = [makeFileObj("non-existent.txt", 100)];
    const result = await readFiles(files, { maxFileSize: MB, concurrency: 1 });

    expect(result.failedFiles).toHaveLength(1);
    expect(result.failedFiles[0].file.relativePath).toBe("non-existent.txt");
  });
});
