import fs from "fs/promises";
import path from "path";
import ignore from "ignore";
import pLimit from "p-limit";
import { defaultPatterns } from "./constants.js";

export async function scanDirectory(
  directory,
  customIgnorePatterns = [],
  options = {}
) {
  const ig = ignore();
  const metadata = {
    gitignorePatterns: 0,
    bundleignorePatterns: 0,
    skippedFiles: 0,
    binarySkipped: 0,
    largeSkipped: 0,
  };

  // Collect all ignore patterns
  let allPatterns = [...defaultPatterns];

  // Load .gitignore if enabled
  if (options.useGitignore !== false) {
    try {
      const gitignorePath = path.join(directory, ".gitignore");
      const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
      const gitignorePatterns = gitignoreContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));

      allPatterns = [...allPatterns, ...gitignorePatterns];
      metadata.gitignorePatterns = gitignorePatterns.length;
    } catch {
      // No .gitignore found
    }
  }

  // Load .bundleignore
  try {
    const bundleignorePath = path.join(directory, ".bundleignore");
    const bundleignoreContent = await fs.readFile(bundleignorePath, "utf-8");
    const bundleignorePatterns = bundleignoreContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    allPatterns = [...allPatterns, ...bundleignorePatterns];
    metadata.bundleignorePatterns = bundleignorePatterns.length;
  } catch {
    // No .bundleignore found
  }

  // Add custom patterns
  if (customIgnorePatterns.length > 0) {
    allPatterns = [...allPatterns, ...customIgnorePatterns];
  }

  // Apply all patterns
  ig.add(allPatterns);

  const limit = pLimit(25);
  const filePromises = [];

  async function scan(dir, relativePath = "") {
    let items;
    try {
      items = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // Skip directories we can't read
    }

    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      const relativeItemPath = path.join(relativePath, item.name);

      // Check if should ignore
      if (ig.ignores(relativeItemPath)) {
        metadata.skippedFiles++;
        continue;
      }

      if (item.isDirectory()) {
        await scan(itemPath, relativeItemPath);
      } else if (item.isFile()) {
        // Queue file read
        const fileTask = limit(async () => {
          try {
            const stats = await fs.stat(itemPath);

            // Skip large files (>10MB)
            if (stats.size > 10 * 1024 * 1024) {
              metadata.largeSkipped++;
              return null;
            }

            const content = await fs.readFile(itemPath, "utf-8");

            // Skip binary files
            if (content.includes("\0")) {
              metadata.binarySkipped++;
              return null;
            }

            // Progress callback if provided
            if (options.onProgress) {
              options.onProgress(relativeItemPath);
            }

            return {
              path: itemPath,
              relativePath: relativeItemPath,
              name: item.name,
              content,
              size: stats.size,
            };
          } catch {
            return null;
          }
        });

        filePromises.push(fileTask);
      }
    }
  }

  await scan(directory);

  // Resolve all reads
  const results = await Promise.all(filePromises);
  const files = results.filter((file) => file !== null);

  return {
    files: files.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    metadata,
  };
}
