import { describe, it, expect } from "vitest";
import { generateTree } from "../../src/utils/tree.js";
import type { FullsendFile } from "../../src/types.js";

function mockFile(path: string): FullsendFile {
  return { path: path, relativePath: path, size: 100 };
}

describe("Utils: Tree Generator", () => {
  it("should generate a flat tree correctly", () => {
    const files = [mockFile("a.txt"), mockFile("b.txt")];
    const output = generateTree(files);
    expect(output).toContain("├── a.txt");
    expect(output).toContain("└── b.txt");
  });

  it("should sort directories before files", () => {
    const files = [mockFile("file.txt"), mockFile("dir/nested.txt")];
    const output = generateTree(files);

    const dirIndex = output.indexOf("dir/");
    const fileIndex = output.indexOf("file.txt");

    expect(dirIndex).toBeLessThan(fileIndex);
  });

  it("should handle deep nesting", () => {
    const files = [mockFile("src/components/ui/button.ts")];
    const output = generateTree(files);

    expect(output).toContain("src/");
    expect(output).toContain("    └── components/");
    expect(output).toContain("        └── ui/");
    expect(output).toContain("            └── button.ts");
  });

  it("should handle empty file lists gracefully", () => {
    expect(generateTree([])).toBe("");
  });

  it("should respect the line limit and truncate", () => {
    const files = [
      mockFile("a.txt"),
      mockFile("b.txt"),
      mockFile("c.txt"),
      mockFile("d.txt"),
    ];
    // Limit to 2 lines
    const output = generateTree(files, { limit: 2 });

    expect(output).toContain("a.txt");
    expect(output).toContain("b.txt");
    expect(output).not.toContain("c.txt");
    expect(output).toContain("more items");
  });

  it("should handle mixed nesting sorting alphabetically", () => {
    const files = [mockFile("b/file.txt"), mockFile("a/file.txt")];
    const output = generateTree(files);
    // a/ should come before b/
    expect(output.indexOf("a/")).toBeLessThan(output.indexOf("b/"));
  });
});
