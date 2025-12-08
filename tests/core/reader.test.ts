import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import * as path from "node:path";
import * as os from "node:os";
import type { FullsendFile } from "../../src/types.js";

// 1. Hoist the mocks so we can reference them in the vi.mock factory
const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

// 2. Mock node:fs/promises
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    // Mock named export (if used)
    readFile: mocks.readFile,
    // IMPORTANT: Mock default export for 'import fs from ...'
    default: {
      ...actual,
      readFile: mocks.readFile,
    },
  };
});

// 3. Mock p-limit
let limitCalls = 0;
let actualLimit: any;

vi.mock("p-limit", () => {
  return {
    default: (concurrency: number) => {
      actualLimit = concurrency;
      return (fn: () => Promise<any>) => {
        limitCalls++;
        return fn();
      };
    },
  };
});

// 4. Imports
import { readFiles } from "../../src/core/reader.js";

describe("Core: Reader", () => {
  let tempDir: string;

  beforeAll(async () => {
    // Use real fs for setup
    const realFs = await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises"
    );
    tempDir = await realFs.mkdtemp(path.join(os.tmpdir(), "reader-test-"));
  });

  afterAll(async () => {
    const realFs = await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises"
    );
    await realFs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readFile.mockReset();
    limitCalls = 0;
    actualLimit = undefined;
  });

  describe("Basic file reading", () => {
    it("should read a single file successfully", async () => {
      const file: FullsendFile = {
        path: "/test/file.ts",
        relativePath: "file.ts",
        size: 100,
      };

      mocks.readFile.mockResolvedValue("const x = 42;");

      const result = await readFiles([file], {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(1);
      expect(result.skippedFiles).toHaveLength(0);
      expect(result.failedFiles).toHaveLength(0);

      expect(result.loadedFiles[0]).toEqual({
        path: "/test/file.ts",
        relativePath: "file.ts",
        size: 100,
        content: "const x = 42;",
      });

      expect(mocks.readFile).toHaveBeenCalledWith("/test/file.ts", "utf8");
    });

    it("should read multiple files", async () => {
      const files: FullsendFile[] = [
        { path: "/test/file1.ts", relativePath: "file1.ts", size: 50 },
        { path: "/test/file2.js", relativePath: "file2.js", size: 75 },
        { path: "/test/file3.md", relativePath: "file3.md", size: 100 },
      ];

      mocks.readFile
        .mockResolvedValueOnce("content1")
        .mockResolvedValueOnce("content2")
        .mockResolvedValueOnce("content3");

      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(3);
      expect(result.loadedFiles[0]!.content).toBe("content1");
      expect(result.loadedFiles[1]!.content).toBe("content2");
      expect(result.loadedFiles[2]!.content).toBe("content3");
    });

    it("should handle empty file list", async () => {
      const result = await readFiles([], {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toEqual([]);
      expect(result.skippedFiles).toEqual([]);
      expect(result.failedFiles).toEqual([]);
      expect(mocks.readFile).not.toHaveBeenCalled();
    });
  });

  describe("File size filtering", () => {
    it("should skip files larger than maxFileSize", async () => {
      const files: FullsendFile[] = [
        { path: "/test/small.ts", relativePath: "small.ts", size: 100 },
        { path: "/test/large.ts", relativePath: "large.ts", size: 2000 },
        { path: "/test/medium.ts", relativePath: "medium.ts", size: 500 },
      ];

      mocks.readFile
        .mockResolvedValueOnce("small content")
        .mockResolvedValueOnce("medium content");

      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(2);
      expect(result.skippedFiles).toHaveLength(1);
      expect(result.failedFiles).toHaveLength(0);

      expect(result.skippedFiles[0]).toEqual({
        path: "/test/large.ts",
        relativePath: "large.ts",
        size: 2000,
      });

      expect(mocks.readFile).not.toHaveBeenCalledWith("/test/large.ts", "utf8");
    });

    it("should handle files exactly at max size", async () => {
      const file: FullsendFile = {
        path: "/test/exact.ts",
        relativePath: "exact.ts",
        size: 1000,
      };

      mocks.readFile.mockResolvedValue("exactly max size");

      const result = await readFiles([file], {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(1);
      expect(result.skippedFiles).toHaveLength(0);
    });

    it("should skip all files if maxFileSize is 0", async () => {
      const files: FullsendFile[] = [
        { path: "/test/file1.ts", relativePath: "file1.ts", size: 1 },
        { path: "/test/file2.ts", relativePath: "file2.ts", size: 100 },
      ];

      const result = await readFiles(files, {
        maxFileSize: 0,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(0);
      expect(result.skippedFiles).toHaveLength(2);
      expect(mocks.readFile).not.toHaveBeenCalled();
    });
  });

  describe("Binary file detection", () => {
    it("should skip files with null bytes (binary files)", async () => {
      const files: FullsendFile[] = [
        { path: "/test/text.ts", relativePath: "text.ts", size: 100 },
        { path: "/test/binary.exe", relativePath: "binary.exe", size: 100 },
      ];

      mocks.readFile
        .mockResolvedValueOnce("normal text content")
        .mockResolvedValueOnce("binary\0content\0with\0nulls");

      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(1);
      expect(result.skippedFiles).toHaveLength(1);

      expect(result.loadedFiles[0]!.relativePath).toBe("text.ts");
      expect(result.skippedFiles[0]!.relativePath).toBe("binary.exe");
    });

    it("should handle files with only null bytes", async () => {
      const file: FullsendFile = {
        path: "/test/nulls.bin",
        relativePath: "nulls.bin",
        size: 100,
      };

      mocks.readFile.mockResolvedValue("\0\0\0\0");

      const result = await readFiles([file], {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(0);
      expect(result.skippedFiles).toHaveLength(1);
    });

    it("should handle empty files (no null bytes)", async () => {
      const file: FullsendFile = {
        path: "/test/empty.txt",
        relativePath: "empty.txt",
        size: 0,
      };

      mocks.readFile.mockResolvedValue("");

      const result = await readFiles([file], {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(1);
      expect(result.loadedFiles[0]!.content).toBe("");
    });
  });

  describe("Error handling", () => {
    it("should handle read errors gracefully", async () => {
      const files: FullsendFile[] = [
        { path: "/test/good.ts", relativePath: "good.ts", size: 100 },
        { path: "/test/bad.ts", relativePath: "bad.ts", size: 100 },
        { path: "/test/good2.ts", relativePath: "good2.ts", size: 100 },
      ];

      mocks.readFile
        .mockResolvedValueOnce("good content")
        .mockRejectedValueOnce(new Error("EACCES: Permission denied"))
        .mockResolvedValueOnce("good content 2");

      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(2);
      expect(result.skippedFiles).toHaveLength(0);
      expect(result.failedFiles).toHaveLength(1);

      expect(result.failedFiles[0]).toEqual({
        file: { path: "/test/bad.ts", relativePath: "bad.ts", size: 100 },
        error: expect.any(Error),
      });

      const error = result.failedFiles[0]!.error as Error;
      expect(error.message).toBe("EACCES: Permission denied");
    });

    it("should continue processing after errors", async () => {
      const files: FullsendFile[] = Array.from({ length: 5 }, (_, i) => ({
        path: `/test/file${i}.ts`,
        relativePath: `file${i}.ts`,
        size: 100,
      }));

      mocks.readFile
        .mockResolvedValueOnce("content0")
        .mockRejectedValueOnce(new Error("Error1"))
        .mockResolvedValueOnce("content2")
        .mockRejectedValueOnce(new Error("Error3"))
        .mockResolvedValueOnce("content4");

      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(3);
      expect(result.failedFiles).toHaveLength(2);

      const loadedPaths = result.loadedFiles.map((f) => f.relativePath);
      expect(loadedPaths).toContain("file0.ts");
      expect(loadedPaths).toContain("file2.ts");
      expect(loadedPaths).toContain("file4.ts");
    });

    it("should handle non-Error throws", async () => {
      const file: FullsendFile = {
        path: "/test/weird.ts",
        relativePath: "weird.ts",
        size: 100,
      };

      mocks.readFile.mockRejectedValue("string error");

      const result = await readFiles([file], {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.failedFiles).toHaveLength(1);
      expect(result.failedFiles[0]!.error).toBe("string error");
    });
  });

  describe("Concurrency control", () => {
    it("should respect concurrency limit", async () => {
      const files: FullsendFile[] = Array.from({ length: 10 }, (_, i) => ({
        path: `/test/file${i}.ts`,
        relativePath: `file${i}.ts`,
        size: 100,
      }));

      mocks.readFile.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "content";
      });

      await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 5,
      });

      expect(actualLimit).toBe(5);
      expect(limitCalls).toBe(10);
    });

    it("should handle concurrency of 1 (sequential processing)", async () => {
      const files: FullsendFile[] = [
        { path: "/test/file1.ts", relativePath: "file1.ts", size: 100 },
        { path: "/test/file2.ts", relativePath: "file2.ts", size: 100 },
        { path: "/test/file3.ts", relativePath: "file3.ts", size: 100 },
      ];

      mocks.readFile
        .mockResolvedValueOnce("content1")
        .mockResolvedValueOnce("content2")
        .mockResolvedValueOnce("content3");

      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 1,
      });

      expect(actualLimit).toBe(1);
      expect(result.loadedFiles).toHaveLength(3);
    });

    it("should handle very high concurrency", async () => {
      const files: FullsendFile[] = Array.from({ length: 100 }, (_, i) => ({
        path: `/test/file${i}.ts`,
        relativePath: `file${i}.ts`,
        size: 10,
      }));

      mocks.readFile.mockResolvedValue("content");

      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 1000,
      });

      expect(actualLimit).toBe(1000);
      expect(result.loadedFiles).toHaveLength(100);
    });
  });

  describe("Mixed scenarios", () => {
    it("should handle mix of loaded, skipped, and failed files", async () => {
      const files: FullsendFile[] = [
        { path: "/test/normal.ts", relativePath: "normal.ts", size: 100 },
        { path: "/test/large.ts", relativePath: "large.ts", size: 2000 },
        { path: "/test/binary.exe", relativePath: "binary.exe", size: 100 },
        { path: "/test/error.ts", relativePath: "error.ts", size: 100 },
        { path: "/test/good.ts", relativePath: "good.ts", size: 100 },
      ];

      mocks.readFile
        .mockResolvedValueOnce("normal content")
        // large.ts skipped (size)
        .mockResolvedValueOnce("binary\0content") // binary.exe
        .mockRejectedValueOnce(new Error("Read error")) // error.ts
        .mockResolvedValueOnce("good content"); // good.ts

      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(2);
      expect(result.skippedFiles).toHaveLength(2);
      expect(result.failedFiles).toHaveLength(1);

      const loadedPaths = result.loadedFiles.map((f) => f.relativePath);
      expect(loadedPaths).toContain("normal.ts");
      expect(loadedPaths).toContain("good.ts");

      const skippedPaths = result.skippedFiles.map((f) => f.relativePath);
      expect(skippedPaths).toContain("large.ts");
      expect(skippedPaths).toContain("binary.exe");

      expect(result.failedFiles[0]!.file.relativePath).toBe("error.ts");
    });

    it("should preserve file metadata in all categories", async () => {
      const file: FullsendFile = {
        path: "/test/file.ts",
        relativePath: "src/file.ts",
        size: 12345,
      };

      mocks.readFile.mockResolvedValue("content");

      const result = await readFiles([file], {
        maxFileSize: 20000,
        concurrency: 10,
      });

      const loaded = result.loadedFiles[0]!;
      expect(loaded.path).toBe("/test/file.ts");
      expect(loaded.relativePath).toBe("src/file.ts");
      expect(loaded.size).toBe(12345);
      expect(loaded.content).toBe("content");
    });
  });

  describe("Edge cases", () => {
    it("should handle files with Unicode content", async () => {
      const file: FullsendFile = {
        path: "/test/unicode.ts",
        relativePath: "unicode.ts",
        size: 100,
      };

      const unicodeContent = "const 你好 = '世界'; // 🌍 émojis работают";
      mocks.readFile.mockResolvedValue(unicodeContent);

      const result = await readFiles([file], {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(1);
      expect(result.loadedFiles[0]!.content).toBe(unicodeContent);
    });

    it("should handle very large file lists", async () => {
      const fileCount = 10000;
      const files: FullsendFile[] = Array.from(
        { length: fileCount },
        (_, i) => ({
          path: `/test/file${i}.ts`,
          relativePath: `file${i}.ts`,
          size: 10,
        })
      );

      mocks.readFile.mockResolvedValue("content");

      const startTime = Date.now();
      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 50,
      });
      const duration = Date.now() - startTime;

      expect(result.loadedFiles).toHaveLength(fileCount);
      expect(duration).toBeLessThan(5000);
    });

    it("should handle Windows-style paths", async () => {
      const file: FullsendFile = {
        path: "C:\\Users\\test\\file.ts",
        relativePath: "src\\file.ts",
        size: 100,
      };

      mocks.readFile.mockResolvedValue("windows content");

      const result = await readFiles([file], {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(mocks.readFile).toHaveBeenCalledWith(
        "C:\\Users\\test\\file.ts",
        "utf8"
      );
      expect(result.loadedFiles[0]!.relativePath).toBe("src\\file.ts");
    });

    it("should handle files with special characters in paths", async () => {
      const files: FullsendFile[] = [
        { path: "/test/file (1).ts", relativePath: "file (1).ts", size: 100 },
        { path: "/test/file@2.ts", relativePath: "file@2.ts", size: 100 },
        { path: "/test/file#3.ts", relativePath: "file#3.ts", size: 100 },
      ];

      mocks.readFile.mockResolvedValue("content");

      const result = await readFiles(files, {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(3);
      expect(mocks.readFile).toHaveBeenCalledWith("/test/file (1).ts", "utf8");
    });

    it("should handle concurrent calls to readFiles", async () => {
      const files1: FullsendFile[] = [
        { path: "/test/a.ts", relativePath: "a.ts", size: 100 },
      ];
      const files2: FullsendFile[] = [
        { path: "/test/b.ts", relativePath: "b.ts", size: 100 },
      ];

      mocks.readFile
        .mockResolvedValueOnce("content a")
        .mockResolvedValueOnce("content b");

      const [result1, result2] = await Promise.all([
        readFiles(files1, { maxFileSize: 1000, concurrency: 10 }),
        readFiles(files2, { maxFileSize: 1000, concurrency: 10 }),
      ]);

      expect(result1.loadedFiles[0]!.content).toBe("content a");
      expect(result2.loadedFiles[0]!.content).toBe("content b");
    });

    it("should handle files with very long content", async () => {
      const file: FullsendFile = {
        path: "/test/huge.ts",
        relativePath: "huge.ts",
        size: 1000000,
      };

      const hugeContent = "x".repeat(1000000);
      mocks.readFile.mockResolvedValue(hugeContent);

      const result = await readFiles([file], {
        maxFileSize: 2000000,
        concurrency: 10,
      });

      expect(result.loadedFiles).toHaveLength(1);
      expect(result.loadedFiles[0]!.content.length).toBe(1000000);
    });

    it("should handle null/undefined in error scenarios", async () => {
      const file: FullsendFile = {
        path: "/test/null.ts",
        relativePath: "null.ts",
        size: 100,
      };

      mocks.readFile.mockRejectedValue(null);

      const result = await readFiles([file], {
        maxFileSize: 1000,
        concurrency: 10,
      });

      expect(result.failedFiles).toHaveLength(1);
      expect(result.failedFiles[0]!.error).toBeNull();
    });
  });
});
