import { describe, it, expect } from "vitest";
import { getLanguageFromFile } from "../../src/formatters/languages.js";

describe("Formatters: Language Detection", () => {
  it("should detect common languages", () => {
    expect(getLanguageFromFile("test.ts")).toBe("typescript");
    expect(getLanguageFromFile("test.js")).toBe("javascript");
    expect(getLanguageFromFile("test.py")).toBe("python");
    expect(getLanguageFromFile("test.rs")).toBe("rust");
  });

  it("should handle complex extensions", () => {
    expect(getLanguageFromFile("test.spec.ts")).toBe("typescript");
    expect(getLanguageFromFile("component.tsx")).toBe("typescript");
  });

  it("should handle case sensitivity", () => {
    expect(getLanguageFromFile("TEST.TS")).toBe("typescript");
    expect(getLanguageFromFile("Image.PNG")).toBe("");
    expect(getLanguageFromFile("file.UNKNOWN")).toBe("");
  });

  it("should handle files without extensions", () => {
    expect(getLanguageFromFile("makefile")).toBe("makefile");
    expect(getLanguageFromFile("dockerfile")).toBe("dockerfile");
    expect(getLanguageFromFile("LICENSE")).toBe("");
  });
});
