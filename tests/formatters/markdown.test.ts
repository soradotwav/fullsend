import { describe, it, expect } from "vitest";
import { formatMarkdown } from "../../src/formatters/markdown.js";
import type { FullsendLoadedFile } from "../../src/types.js";

function mockLoadedFile(path: string, content: string): FullsendLoadedFile {
  return { path, relativePath: path, size: content.length, content };
}

describe("Formatters: Markdown", () => {
  it("should format standard files with language detection", () => {
    const files = [mockLoadedFile("script.ts", "console.log('hi');")];
    const output = formatMarkdown(files);

    expect(output).toContain("script.ts:");
    expect(output).toContain("```typescript");
    expect(output).toContain("console.log('hi');");
  });

  it("should handle files with no extension", () => {
    const files = [mockLoadedFile("Dockerfile", "FROM node")];
    const output = formatMarkdown(files);
    expect(output).toContain("```dockerfile");
  });

  it("should handle unknown extensions gracefully", () => {
    const files = [mockLoadedFile("data.unknown", "raw data")];
    const output = formatMarkdown(files);
    // Should fall back to generic code block
    expect(output).toMatch(/```\s*\n/);
  });

  it("should optionally include tree structure", () => {
    const files = [mockLoadedFile("a.txt", "A")];
    const output = formatMarkdown(files, true);
    expect(output).toContain("## File Structure");
    expect(output).toContain("```text");
    expect(output).toContain("└── a.txt");
  });

  // Harsh Edge Case
  it("documents behavior when file content contains code fences", () => {
    const content = "```\nNested code block\n```";
    const files = [mockLoadedFile("doc.md", content)];
    const output = formatMarkdown(files);

    // In a production-ready system, this should escape or use 4 backticks
    expect(output).toContain(content);
  });
});
