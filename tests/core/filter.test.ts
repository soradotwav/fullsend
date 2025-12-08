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
import ignore from "ignore";

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    // Mock named export
    readFile: mocks.readFile,
    // Mock default export object
    default: {
      ...actual,
      readFile: mocks.readFile,
    },
  };
});

vi.mock("ignore", () => ({
  default: vi.fn(() => ({
    add: vi.fn().mockReturnThis(),
    ignores: vi.fn().mockReturnValue(false),
  })),
}));

// Import after mocks
import { createFilter, getIgnorePatterns } from "../../src/core/filter.js";
import { DEFAULT_IGNORE_PATTERNS } from "../../src/config/index.js";

describe("Core: Filter", () => {
  let tempDir: string;
  let mockIgnoreInstance: any;

  beforeAll(async () => {
    // Use real fs for temp dir creation
    const realFs = await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises"
    );
    tempDir = await realFs.mkdtemp(path.join(os.tmpdir(), "filter-test-"));
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

    mockIgnoreInstance = {
      add: vi.fn().mockReturnThis(),
      ignores: vi.fn().mockReturnValue(false),
    };

    vi.mocked(ignore).mockReturnValue(mockIgnoreInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createFilter", () => {
    it("should create an ignore instance with patterns", async () => {
      const projectDir = tempDir;

      const filter = await createFilter(projectDir, true);

      expect(ignore).toHaveBeenCalled();
      expect(mockIgnoreInstance.add).toHaveBeenCalled();
      expect(filter).toBe(mockIgnoreInstance);
    });

    it("should include default patterns", async () => {
      mocks.readFile.mockRejectedValue(new Error("No file"));

      await createFilter(tempDir, false);

      const addCall = mockIgnoreInstance.add.mock.calls[0][0];
      expect(addCall).toEqual(
        expect.arrayContaining([...DEFAULT_IGNORE_PATTERNS])
      );
    });

    it("should handle gitignore when enabled", async () => {
      const gitignoreContent = "node_modules/\n*.log\n# Comment\n\n.env";
      mocks.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.toString().includes(".gitignore")) {
          return gitignoreContent;
        }
        throw new Error("File not found");
      });

      await createFilter(tempDir, true);

      const patterns = mockIgnoreInstance.add.mock.calls[0][0];
      expect(patterns).toContain("node_modules/");
      expect(patterns).toContain("*.log");
      expect(patterns).toContain(".env");
      expect(patterns).not.toContain("# Comment");
    });

    it("should skip gitignore when disabled", async () => {
      mocks.readFile.mockResolvedValue("should-not-be-included");

      await createFilter(tempDir, false);

      const readFileCalls = mocks.readFile.mock.calls;
      const gitignoreCall = readFileCalls.find((call) =>
        call[0].toString().includes(".gitignore")
      );

      if (gitignoreCall) {
        expect(gitignoreCall[0]).not.toContain(".gitignore");
      }
    });

    it("should include .fullsendignore patterns", async () => {
      const fullsendContent = "build/\ntest-results/\n*.tmp";
      mocks.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.toString().includes(".fullsendignore")) {
          return fullsendContent;
        }
        throw new Error("File not found");
      });

      await createFilter(tempDir, false);

      const patterns = mockIgnoreInstance.add.mock.calls[0][0];
      expect(patterns).toContain("build/");
      expect(patterns).toContain("test-results/");
      expect(patterns).toContain("*.tmp");
    });
  });

  describe("getIgnorePatterns", () => {
    it("should return only default patterns when no ignore files exist", async () => {
      mocks.readFile.mockRejectedValue(new Error("ENOENT"));

      const patterns = await getIgnorePatterns(tempDir, true);

      expect(patterns).toEqual(DEFAULT_IGNORE_PATTERNS);
    });

    it("should parse .gitignore correctly", async () => {
      const gitignoreContent = `
# Build directories
dist/
build/

# Dependencies
node_modules/
*.lock
      `.trim();

      mocks.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.toString().includes(".gitignore")) {
          return gitignoreContent;
        }
        throw new Error("File not found");
      });

      const patterns = await getIgnorePatterns(tempDir, true);

      const gitPatterns = patterns.filter(
        (p) => !DEFAULT_IGNORE_PATTERNS.includes(p)
      );

      expect(gitPatterns).toContain("dist/");
      expect(gitPatterns).toContain("build/");
      expect(gitPatterns).not.toContain("# Build directories");
    });

    it("should handle both ignore files simultaneously", async () => {
      mocks.readFile.mockImplementation(async (filePath: any) => {
        const path = filePath.toString();
        if (path.includes(".gitignore")) {
          return "from-git";
        }
        if (path.includes(".fullsendignore")) {
          return "from-fullsend";
        }
        throw new Error("File not found");
      });

      const patterns = await getIgnorePatterns(tempDir, true);

      expect(patterns).toContain("from-git");
      expect(patterns).toContain("from-fullsend");
      expect(patterns).toEqual(
        expect.arrayContaining([...DEFAULT_IGNORE_PATTERNS])
      );
    });

    it("should handle file read errors silently", async () => {
      mocks.readFile.mockRejectedValue(new Error("Permission denied"));

      const patterns = await getIgnorePatterns(tempDir, true);

      expect(patterns).toEqual(DEFAULT_IGNORE_PATTERNS);
    });
  });
});
