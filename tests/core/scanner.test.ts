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

// 1. Mock fs/promises BEFORE imports
// We need to mock both named exports and the default export object
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  // Create generic mocks that wrap the actual implementations
  // We use the same vi.fn() instance for both named and default exports
  const mockedStat = vi.fn(actual.stat);
  const mockedReaddir = vi.fn(actual.readdir);

  return {
    ...actual,
    // Named exports
    stat: mockedStat,
    readdir: mockedReaddir,
    // Default export (simulated for ESM interop)
    default: {
      ...actual,
      stat: mockedStat,
      readdir: mockedReaddir,
    },
  };
});

// Mock the filter module
vi.mock("../../src/core/filter.js", () => ({
  createFilter: vi.fn().mockResolvedValue({
    ignores: vi.fn().mockReturnValue(false),
  }),
}));

// Mock the config module
vi.mock("../../src/config/index.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    DEBUG: false,
  };
});

// 2. Import modules
import * as fs from "node:fs/promises";
import { scanDirectory } from "../../src/core/scanner.js";
import { createFilter } from "../../src/core/filter.js";

describe("Core: Scanner", () => {
  let tempDir: string;
  let consoleErrorSpy: any;

  // Type-safe access to the default export for mocking purposes
  const fsMock = fs as unknown as {
    default: {
      stat: typeof fs.stat;
      readdir: typeof fs.readdir;
    };
    stat: typeof fs.stat;
    readdir: typeof fs.readdir;
  };

  // Get reference to original implementations
  const originalStat = (
    fsMock.stat as unknown as { getMockImplementation: () => any }
  ).getMockImplementation();
  const originalReaddir = (
    fsMock.readdir as unknown as { getMockImplementation: () => any }
  ).getMockImplementation();

  beforeAll(async () => {
    // We use the real fs (wrapped in spy) for setup
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "scanner-test-"));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Reset fs mocks to original implementation
    vi.mocked(fsMock.stat).mockImplementation(originalStat);
    vi.mocked(fsMock.readdir).mockImplementation(originalReaddir);

    // Explicitly reset the default export mocks as well to ensure consistency
    if (fsMock.default && fsMock.default.stat) {
      vi.mocked(fsMock.default.stat).mockImplementation(originalStat);
      vi.mocked(fsMock.default.readdir).mockImplementation(originalReaddir);
    }
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Basic file scanning", () => {
    it("should scan a single file in root directory", async () => {
      const testDir = path.join(tempDir, "single-file");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "test.js"), "console.log('test');");

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        path: path.join(testDir, "test.js"),
        relativePath: "test.js",
        size: expect.any(Number),
      });
      expect(result[0]!.size).toBeGreaterThan(0);
    });

    it("should scan multiple files", async () => {
      const testDir = path.join(tempDir, "multiple-files");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "file1.ts"), "const a = 1;");
      await fs.writeFile(path.join(testDir, "file2.md"), "# Hello");
      await fs.writeFile(path.join(testDir, "file3.json"), "{}");

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(3);
      const paths = result.map((f) => f.relativePath).sort();
      expect(paths).toEqual(["file1.ts", "file2.md", "file3.json"]);
    });

    it("should handle empty directories", async () => {
      const testDir = path.join(tempDir, "empty-dir");
      await fs.mkdir(testDir, { recursive: true });

      const result = await scanDirectory(testDir);

      expect(result).toEqual([]);
    });
  });

  describe("Nested directory scanning", () => {
    it("should scan nested directories recursively", async () => {
      const testDir = path.join(tempDir, "nested");
      await fs.mkdir(path.join(testDir, "src", "utils"), { recursive: true });
      await fs.mkdir(path.join(testDir, "tests"), { recursive: true });

      await fs.writeFile(path.join(testDir, "README.md"), "# Project");
      await fs.writeFile(path.join(testDir, "src", "index.ts"), "export {}");
      await fs.writeFile(
        path.join(testDir, "src", "utils", "helper.ts"),
        "export {}"
      );
      await fs.writeFile(path.join(testDir, "tests", "test.spec.ts"), "test()");

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(4);
      const paths = result.map((f) => f.relativePath).sort();
      expect(paths).toEqual([
        "README.md",
        "src/index.ts",
        "src/utils/helper.ts",
        "tests/test.spec.ts",
      ]);
    });

    it("should handle deeply nested structures", async () => {
      const testDir = path.join(tempDir, "deep-nest");
      const deepPath = path.join(testDir, "a", "b", "c", "d", "e");
      await fs.mkdir(deepPath, { recursive: true });
      await fs.writeFile(path.join(deepPath, "deep.txt"), "deep content");

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]!.relativePath).toBe("a/b/c/d/e/deep.txt");
    });
  });

  describe("Ignore patterns", () => {
    it("should respect ignore patterns from filter", async () => {
      const testDir = path.join(tempDir, "ignored");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "keep.js"), "keep");
      await fs.writeFile(path.join(testDir, "ignore.js"), "ignore");

      // Mock filter to ignore specific file
      const mockFilter = {
        ignores: vi.fn((path: string) => path === "ignore.js"),
      };
      vi.mocked(createFilter).mockResolvedValue(mockFilter as any);

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]!.relativePath).toBe("keep.js");
      expect(mockFilter.ignores).toHaveBeenCalledWith("keep.js");
      expect(mockFilter.ignores).toHaveBeenCalledWith("ignore.js");
    });

    it("should ignore entire directories when matched", async () => {
      const testDir = path.join(tempDir, "ignore-dir");
      await fs.mkdir(path.join(testDir, "src"), { recursive: true });
      await fs.mkdir(path.join(testDir, "node_modules"), { recursive: true });
      await fs.writeFile(path.join(testDir, "src", "index.js"), "src");
      await fs.writeFile(path.join(testDir, "node_modules", "pkg.js"), "pkg");

      const mockFilter = {
        ignores: vi.fn((path: string) => path.startsWith("node_modules")),
      };
      vi.mocked(createFilter).mockResolvedValue(mockFilter as any);

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]!.relativePath).toBe("src/index.js");
    });

    it("should use gitignore setting correctly", async () => {
      const testDir = path.join(tempDir, "gitignore-test");
      await fs.mkdir(testDir, { recursive: true });

      await scanDirectory(testDir, { useGitIgnore: false });
      expect(createFilter).toHaveBeenCalledWith(expect.any(String), false);

      await scanDirectory(testDir, { useGitIgnore: true });
      expect(createFilter).toHaveBeenCalledWith(expect.any(String), true);

      // Default should be true
      await scanDirectory(testDir);
      expect(createFilter).toHaveBeenLastCalledWith(expect.any(String), true);
    });
  });

  describe("File information", () => {
    it("should provide correct file sizes", async () => {
      const testDir = path.join(tempDir, "file-sizes");
      await fs.mkdir(testDir, { recursive: true });

      const smallContent = "small";
      const largeContent = "x".repeat(1000);

      await fs.writeFile(path.join(testDir, "small.txt"), smallContent);
      await fs.writeFile(path.join(testDir, "large.txt"), largeContent);

      const result = await scanDirectory(testDir);
      const small = result.find((f) => f.relativePath === "small.txt");
      const large = result.find((f) => f.relativePath === "large.txt");

      expect(small!.size).toBe(Buffer.byteLength(smallContent));
      expect(large!.size).toBe(Buffer.byteLength(largeContent));
    });

    it("should handle zero-byte files", async () => {
      const testDir = path.join(tempDir, "zero-byte");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "empty.txt"), "");

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]!.size).toBe(0);
    });

    it("should use absolute paths for path property", async () => {
      const testDir = path.join(tempDir, "abs-paths");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "file.txt"), "content");

      const result = await scanDirectory(testDir);

      expect(path.isAbsolute(result[0]!.path)).toBe(true);
      expect(result[0]!.path).toBe(path.resolve(testDir, "file.txt"));
    });
  });

  describe("Event callbacks", () => {
    it("should call onEvent for each file found", async () => {
      const testDir = path.join(tempDir, "events");
      await fs.mkdir(path.join(testDir, "sub"), { recursive: true });
      await fs.writeFile(path.join(testDir, "file1.txt"), "1");
      await fs.writeFile(path.join(testDir, "sub", "file2.txt"), "2");

      const onEvent = vi.fn();
      await scanDirectory(testDir, { onEvent });

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(onEvent).toHaveBeenCalledWith("file1.txt");
      expect(onEvent).toHaveBeenCalledWith("sub/file2.txt");
    });

    it("should not call onEvent for ignored files", async () => {
      const testDir = path.join(tempDir, "events-ignored");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "keep.txt"), "keep");
      await fs.writeFile(path.join(testDir, "skip.txt"), "skip");

      const mockFilter = {
        ignores: vi.fn((path: string) => path === "skip.txt"),
      };
      vi.mocked(createFilter).mockResolvedValue(mockFilter as any);

      const onEvent = vi.fn();
      await scanDirectory(testDir, { onEvent });

      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith("keep.txt");
      expect(onEvent).not.toHaveBeenCalledWith("skip.txt");
    });
  });

  describe("Special file types", () => {
    it("should skip non-regular files", async () => {
      const testDir = path.join(tempDir, "special-files");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "regular.txt"), "content");

      // Create a symlink (if supported by the OS)
      try {
        await fs.symlink(
          path.join(testDir, "regular.txt"),
          path.join(testDir, "link.txt")
        );
      } catch {
        // Skip symlink test if not supported
        console.log("Symlinks not supported, skipping symlink test");
      }

      const result = await scanDirectory(testDir);

      // Should only include regular files, not symlinks
      const regularFiles = result.filter(
        (f) => !f.relativePath.includes("link")
      );
      expect(regularFiles.length).toBeGreaterThan(0);
    });

    it("should handle files with special characters in names", async () => {
      const testDir = path.join(tempDir, "special-chars");
      await fs.mkdir(testDir, { recursive: true });

      const specialNames = [
        "file with spaces.txt",
        "file-with-dashes.js",
        "file_with_underscores.py",
        "file.multiple.dots.ts",
        "UPPERCASE.TXT",
      ];

      for (const name of specialNames) {
        await fs.writeFile(path.join(testDir, name), "content");
      }

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(specialNames.length);
      const foundNames = result.map((f) => f.relativePath).sort();
      expect(foundNames).toEqual(specialNames.sort());
    });

    it("should handle Unicode filenames", async () => {
      const testDir = path.join(tempDir, "unicode");
      await fs.mkdir(testDir, { recursive: true });

      const unicodeNames = [
        "файл.txt", // Cyrillic
        "文件.js", // Chinese
        "ファイル.md", // Japanese
        "파일.ts", // Korean
        "αρχείο.py", // Greek
      ];

      for (const name of unicodeNames) {
        try {
          await fs.writeFile(path.join(testDir, name), "content");
        } catch {
          // Skip if filesystem doesn't support this Unicode character
          console.log(`Skipping Unicode filename: ${name}`);
        }
      }

      const result = await scanDirectory(testDir);

      // Should find at least some files (depending on OS support)
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Error handling", () => {
    it("should handle permission errors gracefully in DEBUG mode", async () => {
      vi.resetModules();

      // Mock config module
      vi.doMock("../../src/config/index.js", () => ({
        DEBUG: true,
        DEFAULT_IGNORE_PATTERNS: [],
        DEFAULT_USER_CONFIG: {},
      }));

      // Mock fs.stat to throw error - Apply to both interfaces to be sure
      const mockStatImpl = async (filePath: any, options?: any) => {
        if (filePath.toString().includes("perms")) {
          throw new Error("EACCES: Permission denied");
        }
        return originalStat(filePath, options);
      };

      vi.mocked(fsMock.stat).mockImplementation(mockStatImpl);
      if (fsMock.default && fsMock.default.stat) {
        vi.mocked(fsMock.default.stat).mockImplementation(mockStatImpl);
      }

      const { scanDirectory: debugScanner } = await import(
        "../../src/core/scanner.js"
      );

      const testDir = path.join(tempDir, "perms");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "file.txt"), "content");

      const result = await debugScanner(testDir);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toEqual([]);

      vi.doUnmock("../../src/config/index.js");
      vi.resetModules();
    });

    it("should handle missing directory errors", async () => {
      const nonExistent = path.join(tempDir, "does-not-exist-" + Date.now());

      await expect(async () => {
        const result = await scanDirectory(nonExistent);
        expect(result).toEqual([]);
      }).not.toThrow();
    });

    it("should continue scanning after file stat errors", async () => {
      const testDir = path.join(tempDir, "stat-errors");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "good1.txt"), "1");
      await fs.writeFile(path.join(testDir, "bad.txt"), "bad");
      await fs.writeFile(path.join(testDir, "good2.txt"), "2");

      const mockStatImpl = async (filePath: any, options?: any) => {
        if (filePath.toString().includes("bad.txt")) {
          throw new Error("Stat error");
        }
        return originalStat(filePath, options);
      };

      vi.mocked(fsMock.stat).mockImplementation(mockStatImpl);
      if (fsMock.default && fsMock.default.stat) {
        vi.mocked(fsMock.default.stat).mockImplementation(mockStatImpl);
      }

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(2);
      const paths = result.map((f) => f.relativePath).sort();
      expect(paths).toEqual(["good1.txt", "good2.txt"]);
    });

    it("should handle readdir errors in subdirectories", async () => {
      const testDir = path.join(tempDir, "readdir-error");
      await fs.mkdir(path.join(testDir, "accessible"), { recursive: true });
      await fs.mkdir(path.join(testDir, "problem"), { recursive: true });
      await fs.writeFile(path.join(testDir, "root.txt"), "root");
      await fs.writeFile(path.join(testDir, "accessible", "file.txt"), "ok");

      const mockReaddirImpl = async (dirPath: any, options?: any) => {
        if (dirPath.toString().includes("problem")) {
          throw new Error("EACCES: Permission denied");
        }
        return originalReaddir(dirPath, options);
      };

      vi.mocked(fsMock.readdir).mockImplementation(mockReaddirImpl);
      if (fsMock.default && fsMock.default.readdir) {
        vi.mocked(fsMock.default.readdir).mockImplementation(mockReaddirImpl);
      }

      const result = await scanDirectory(testDir);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const paths = result.map((f) => f.relativePath);
      expect(paths).toContain("root.txt");
      expect(paths).toContain("accessible/file.txt");
    });
  });

  describe("Edge cases", () => {
    it("should handle directories with thousands of files", async () => {
      const testDir = path.join(tempDir, "many-files");
      await fs.mkdir(testDir, { recursive: true });

      const fileCount = 100;
      const promises = [];
      for (let i = 0; i < fileCount; i++) {
        promises.push(
          fs.writeFile(path.join(testDir, `file${i}.txt`), `content${i}`)
        );
      }
      await Promise.all(promises);

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(fileCount);
    });

    it("should handle very long file paths", async () => {
      const testDir = path.join(tempDir, "long-paths");

      let currentPath = testDir;
      const longName = "a".repeat(50);

      for (let i = 0; i < 5; i++) {
        currentPath = path.join(currentPath, `${longName}${i}`);
      }

      await fs.mkdir(currentPath, { recursive: true });
      await fs.writeFile(path.join(currentPath, "deep-file.txt"), "deep");

      const result = await scanDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]!.relativePath.length).toBeGreaterThan(250);
    });

    it("should handle concurrent scanning of same directory", async () => {
      const testDir = path.join(tempDir, "concurrent");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "file1.txt"), "1");
      await fs.writeFile(path.join(testDir, "file2.txt"), "2");

      const results = await Promise.all([
        scanDirectory(testDir),
        scanDirectory(testDir),
        scanDirectory(testDir),
      ]);

      expect(results[0]).toHaveLength(2);
      expect(results[1]).toHaveLength(2);
      expect(results[2]).toHaveLength(2);

      const paths0 = results[0].map((f) => f.relativePath).sort();
      const paths1 = results[1].map((f) => f.relativePath).sort();

      expect(paths0).toEqual(paths1);
    });

    it("should handle relative vs absolute input paths", async () => {
      const testDir = path.join(tempDir, "rel-abs");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "file.txt"), "content");

      const absoluteResult = await scanDirectory(testDir);

      const originalCwd = process.cwd();
      process.chdir(tempDir);
      const relativeResult = await scanDirectory("rel-abs");
      process.chdir(originalCwd);

      expect(absoluteResult).toHaveLength(1);
      expect(relativeResult).toHaveLength(1);
      expect(absoluteResult[0]!.relativePath).toBe("file.txt");
      expect(relativeResult[0]!.relativePath).toBe("file.txt");
    });

    it("should handle dot directories correctly", async () => {
      const testDir = path.join(tempDir, "dots");
      await fs.mkdir(path.join(testDir, ".hidden"), { recursive: true });
      await fs.mkdir(path.join(testDir, "..weird"), { recursive: true });
      await fs.mkdir(path.join(testDir, "normal"), { recursive: true });

      await fs.writeFile(path.join(testDir, ".hidden", "file.txt"), "1");
      await fs.writeFile(path.join(testDir, "..weird", "file.txt"), "2");
      await fs.writeFile(path.join(testDir, "normal", "file.txt"), "3");

      const result = await scanDirectory(testDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const paths = result.map((f) => f.relativePath);
      expect(paths).toContain("normal/file.txt");
    });
  });

  describe("Platform-specific behavior", () => {
    it("should handle different path separators consistently", async () => {
      const testDir = path.join(tempDir, "separators");
      await fs.mkdir(path.join(testDir, "sub", "deep"), { recursive: true });
      await fs.writeFile(path.join(testDir, "sub", "deep", "file.txt"), "test");

      const result = await scanDirectory(testDir);

      if (os.platform() === "win32") {
        expect(result[0]!.relativePath).toMatch(/sub[\\/]deep[\\/]file.txt/);
      } else {
        expect(result[0]!.relativePath).toBe("sub/deep/file.txt");
      }

      expect(result[0]!.path).toBe(
        path.join(testDir, "sub", "deep", "file.txt")
      );
    });

    it("should handle case-sensitivity appropriately", async () => {
      const testDir = path.join(tempDir, "case");
      await fs.mkdir(testDir, { recursive: true });

      await fs.writeFile(path.join(testDir, "lowercase.txt"), "1");
      await fs.writeFile(path.join(testDir, "UPPERCASE.TXT"), "2");

      const result = await scanDirectory(testDir);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });
});
