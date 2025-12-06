import fs from "node:fs/promises";
import path from "node:path";
import { DEBUG, DEFAULT_IGNORE_PATTERNS } from "../config/index.js";
import ignore, { type Ignore } from "ignore";

/**
 * Creates an ignore engine configured with patterns from defaults,
 * .gitignore (optional), and .fullsendignore.
 *
 * @param projectDir - The root directory to look for ignore files in
 * @param useGitIgnore - Whether to include .gitignore patterns
 * @returns An 'ignore' instance that can check if paths should be ignored
 */
export async function createFilter(
  projectDir: string,
  useGitIgnore: boolean
): Promise<Ignore> {
  const patterns = await loadIgnorePatterns(projectDir, useGitIgnore);
  return ignore().add(patterns);
}

/**
 * Parses file content into a list of ignore patterns.
 * Removes comments (starting with #) and empty lines.
 *
 * @param content - The raw content of an ignore file
 * @returns Array of clean pattern strings
 */
function extractPatterns(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * Loads all ignore patterns from various sources.
 * Priority order (implicit): Default < .gitignore < .fullsendignore
 *
 * @param projectDir - The directory containing the ignore files
 * @param useGitIgnore - Whether to read .gitignore
 * @returns Combined list of all ignore patterns
 */
async function loadIgnorePatterns(
  projectDir: string,
  useGitIgnore: boolean
): Promise<string[]> {
  const gitignorePatterns: string[] = [];
  const fullsendignorePatterns: string[] = [];

  // 1. Try loading .gitignore
  if (useGitIgnore) {
    try {
      const gitignoreContent = await fs.readFile(
        path.join(projectDir, ".gitignore"),
        "utf8"
      );
      gitignorePatterns.push(...extractPatterns(gitignoreContent));
    } catch (error) {
      // File missing is fine, log only if debug
      if (DEBUG) console.log("No .gitignore found or not readable.");
    }
  }

  // 2. Try loading .fullsendignore
  try {
    const fullsendignoreContent = await fs.readFile(
      path.join(projectDir, ".fullsendignore"),
      "utf8"
    );
    fullsendignorePatterns.push(...extractPatterns(fullsendignoreContent));
  } catch (error) {
    if (DEBUG) console.log("No .fullsendignore found or not readable.");
  }

  const allPatterns = [
    ...DEFAULT_IGNORE_PATTERNS,
    ...gitignorePatterns,
    ...fullsendignorePatterns,
  ];

  if (DEBUG) {
    console.log("Loaded ignore patterns:", allPatterns);
  }

  return allPatterns;
}
