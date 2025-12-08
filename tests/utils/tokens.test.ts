// tests/utils/tokens.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Create a mock encode function that we can access in tests
const mockEncode = vi.fn();

// Mock the Tiktoken class INSIDE the factory to avoid hoisting issues
vi.mock("js-tiktoken/lite", () => {
  return {
    Tiktoken: class {
      encode = mockEncode;
      decode = vi.fn();
      encode_ordinary = vi.fn();
      decode_single_token_bytes = vi.fn();
    },
  };
});

// Mock the ranks module initially
vi.mock("js-tiktoken/ranks/cl100k_base", () => ({
  default: { test: "ranks" },
}));

// Import AFTER mocking
import { countTokens } from "../../src/utils/tokens.js";

describe("Utils: Token Counter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEncode.mockReset();
    // Ensure ranks mock is good by default
    vi.doMock("js-tiktoken/ranks/cl100k_base", () => ({
      default: { test: "ranks" },
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("Basic Functionality", () => {
    it("should count tokens for text", async () => {
      mockEncode.mockReturnValue(new Array(10));

      const result = await countTokens("Hello, world!");

      expect(mockEncode).toHaveBeenCalledWith("Hello, world!");
      expect(result).toBe(10);
    });

    it("should return 0 for empty string", async () => {
      mockEncode.mockReturnValue([]);

      const result = await countTokens("");

      expect(result).toBe(0);
    });

    it("should handle unicode text", async () => {
      mockEncode.mockReturnValue(new Array(15));

      const result = await countTokens("Hello 世界 🌍");

      expect(mockEncode).toHaveBeenCalledWith("Hello 世界 🌍");
      expect(result).toBe(15);
    });
  });

  describe("Chunking", () => {
    it("should not chunk text under 500,000 characters", async () => {
      mockEncode.mockReturnValue(new Array(100));

      const text = "x".repeat(499999);
      const result = await countTokens(text);

      expect(mockEncode).toHaveBeenCalledTimes(1);
      expect(result).toBe(100);
    });

    it("should chunk text over 500,000 characters", async () => {
      mockEncode
        .mockReturnValueOnce(new Array(100)) // First chunk
        .mockReturnValueOnce(new Array(50)); // Second chunk

      const text = "x".repeat(600000);
      const result = await countTokens(text);

      expect(mockEncode).toHaveBeenCalledTimes(2);
      expect(mockEncode).toHaveBeenNthCalledWith(1, "x".repeat(500000));
      expect(mockEncode).toHaveBeenNthCalledWith(2, "x".repeat(100000));
      expect(result).toBe(150);
    });

    it("should handle multiple chunks", async () => {
      // 3 chunks: 500k, 500k, 500k
      mockEncode
        .mockReturnValueOnce(new Array(100))
        .mockReturnValueOnce(new Array(100))
        .mockReturnValueOnce(new Array(100));

      const text = "x".repeat(1500000);
      const result = await countTokens(text);

      expect(mockEncode).toHaveBeenCalledTimes(3);
      expect(result).toBe(300);
    });

    it("should yield to event loop between chunks", async () => {
      mockEncode.mockReturnValue(new Array(100));
      const setImmediateSpy = vi.spyOn(global, "setImmediate");

      const text = "x".repeat(1000000); // 2 chunks
      await countTokens(text);

      // Implementation calls setImmediate after EVERY chunk loop iteration
      // So for 2 chunks, it's called 2 times
      expect(setImmediateSpy).toHaveBeenCalledTimes(2);

      setImmediateSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    it("should return 0 if encoder fails to load", async () => {
      vi.resetModules();
      // Mock the import to fail
      vi.doMock("js-tiktoken/ranks/cl100k_base", () => {
        throw new Error("Failed to load ranks");
      });

      // Re-import
      const { countTokens: freshCountTokens } = await import(
        "../../src/utils/tokens.js"
      );

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await freshCountTokens("test");
      expect(result).toBe(0);

      consoleSpy.mockRestore();
    });

    it("should cache encoder instance", async () => {
      vi.resetModules();
      // Explicitly restore good mock to overwrite any previous bad mocks
      vi.doMock("js-tiktoken/ranks/cl100k_base", () => ({
        default: { test: "ranks" },
      }));

      const { countTokens: freshCountTokens } = await import(
        "../../src/utils/tokens.js"
      );

      mockEncode.mockReturnValue(new Array(10));

      // Multiple calls
      await freshCountTokens("text1");
      await freshCountTokens("text2");
      await freshCountTokens("text3");

      expect(mockEncode).toHaveBeenCalledTimes(3);
    });
  });

  describe("Real-world Usage", () => {
    it("should handle typical code file", async () => {
      const code = `
function hello() {
  console.log("Hello, world!");
}

export default hello;`;

      mockEncode.mockReturnValue(new Array(20));

      const result = await countTokens(code);
      expect(result).toBe(20);
    });

    it("should handle large bundled output", async () => {
      const largeBundle = "x".repeat(600000);

      mockEncode
        .mockReturnValueOnce(new Array(5000))
        .mockReturnValueOnce(new Array(1000));

      const result = await countTokens(largeBundle);
      expect(result).toBe(6000);
    });

    it("should handle concurrent calls", async () => {
      mockEncode.mockImplementation((text: string) => {
        return new Array(text.length);
      });

      const results = await Promise.all([
        countTokens("short"),
        countTokens("medium text"),
        countTokens("longer text here"),
      ]);

      expect(results).toEqual([5, 11, 16]);
    });
  });
});
