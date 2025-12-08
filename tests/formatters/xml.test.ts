import { describe, it, expect } from "vitest";
import { formatXml } from "../../src/formatters/xml.js";
import type { FullsendLoadedFile } from "../../src/types.js";

function mockLoadedFile(path: string, content: string): FullsendLoadedFile {
  return { path, relativePath: path, size: content.length, content };
}

describe("Formatters: XML", () => {
  it("should wrap content in CDATA", () => {
    const files = [mockLoadedFile("test.txt", "Hello World")];
    const output = formatXml(files);
    expect(output).toContain("<![CDATA[Hello World]]>");
  });

  it("should escape XML special characters in file path attributes", () => {
    const weirdPath = 'folder/"name"<&>.txt';
    const files = [mockLoadedFile(weirdPath, "content")];
    const output = formatXml(files);

    expect(output).toContain('path="folder/&quot;name&quot;&lt;&amp;&gt;.txt"');
    expect(output).not.toContain('path="folder/"name"<&>.txt"');
  });

  it("should handle CDATA termination sequences inside content (Injection Prevention)", () => {
    const maliciousContent = "This contains ]]> inside it.";
    const files = [mockLoadedFile("exploit.txt", maliciousContent)];
    const output = formatXml(files);

    // Should verify it doesn't contain a raw closing sequence that isn't part of the content logic
    expect(output).toContain("This contains");
    expect(output).toContain("]]]]><![CDATA[>"); // The escaped version
  });

  it("should optionally include tree structure", () => {
    const files = [mockLoadedFile("a.txt", "A")];
    const output = formatXml(files, true);
    expect(output).toContain("<structure>");
    expect(output).toContain("└── a.txt");
  });
});
