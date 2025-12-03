import fs from "fs/promises";
import path from "path";
import ignore from "ignore";
import chalk from "chalk";
import pLimit from "p-limit";
import { defaultPatterns } from "./constants.js";

export async function scanDirectory(
  directory,
  customIgnorePatterns = [],
  options = {}
) {
  const ig = ignore();

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
      console.log(
        chalk.dim(`Loaded ${gitignorePatterns.length} patterns from .gitignore`)
      );
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
    console.log(
      chalk.dim(
        `Loaded ${bundleignorePatterns.length} patterns from .bundleignore`
      )
    );
  } catch {
    // No .bundleignore found
  }

  // Add custom patterns
  if (customIgnorePatterns.length > 0) {
    allPatterns = [...allPatterns, ...customIgnorePatterns];
    console.log(
      chalk.dim(`Added ${customIgnorePatterns.length} custom patterns`)
    );
  }

  // Apply all patterns
  ig.add(allPatterns);

  const limit = pLimit(25);
  const filePromises = [];

  // Only track ignores from pattern matching (synchronous, safe)
  let skippedFromIgnore = 0;

  async function scan(dir, relativePath = "") {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      const relativeItemPath = path.join(relativePath, item.name);

      // Check if should ignore (synchronous)
      if (ig.ignores(relativeItemPath)) {
        skippedFromIgnore++;
        continue;
      }

      if (item.isDirectory()) {
        await scan(itemPath, relativeItemPath);
      } else if (item.isFile()) {
        // Queue file read - don't mutate any counters inside
        const fileTask = limit(async () => {
          try {
            const stats = await fs.stat(itemPath);

            // Skip large files
            if (stats.size > 10 * 1024 * 1024) {
              if (options.verbose) {
                console.warn(
                  chalk.yellow(
                    `Skipping large file: ${relativeItemPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`
                  )
                );
              }
              return null;
            }

            const content = await fs.readFile(itemPath, "utf-8");

            // Skip binary files
            if (content.includes("\0")) {
              if (options.verbose) {
                console.warn(
                  chalk.yellow(`Skipping binary file: ${relativeItemPath}`)
                );
              }
              return null;
            }

            return {
              path: itemPath,
              relativePath: relativeItemPath,
              name: item.name,
              content,
              size: stats.size,
            };
          } catch {
            if (options.verbose) {
              console.warn(
                chalk.yellow(`Skipping unreadable file: ${relativeItemPath}`)
              );
            }
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
  const skippedFromReads = results.length - files.length;

  // Total skipped
  const totalSkipped = skippedFromIgnore + skippedFromReads;
  if (totalSkipped > 0) {
    console.log(chalk.dim(`Skipped ${totalSkipped} files/directories`));
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
