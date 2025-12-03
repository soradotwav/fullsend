import fs from "fs/promises";
import path from "path";
import ignore from "ignore";
import chalk from "chalk";

export async function scanDirectory(
  directory,
  customIgnorePatterns = [],
  options = {}
) {
  const ig = ignore();

  // Default patterns (always applied)
  const defaultPatterns = [
    "node_modules",
    ".git",
    ".DS_Store",
    "*.log",
    "dist",
    "build",
    "coverage",
    ".defaultignore",
    ".bundleignore",
    ".gitignore",
    ".env",
    ".env.*",
    "*.lock",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
  ];

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

  const files = [];
  let skippedCount = 0;

  async function scan(dir, relativePath = "") {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      const relativeItemPath = path.join(relativePath, item.name);

      // Check if should ignore
      if (ig.ignores(relativeItemPath)) {
        skippedCount++;
        continue;
      }

      if (item.isDirectory()) {
        await scan(itemPath, relativeItemPath);
      } else if (item.isFile()) {
        try {
          const stats = await fs.stat(itemPath);

          // Skip very large files (>10MB)
          if (stats.size > 10 * 1024 * 1024) {
            console.warn(
              chalk.yellow(
                `Skipping large file: ${relativeItemPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`
              )
            );
            skippedCount++;
            continue;
          }

          const content = await fs.readFile(itemPath, "utf-8");
          files.push({
            path: itemPath,
            relativePath: relativeItemPath,
            name: item.name,
            content,
            size: stats.size,
          });
        } catch (error) {
          // Skip binary files or files that can't be read as UTF-8
          if (options.verbose) {
            console.warn(
              chalk.yellow(
                `Skipping binary/unreadable file: ${relativeItemPath}`
              )
            );
          }
          skippedCount++;
        }
      }
    }
  }

  await scan(directory);

  if (skippedCount > 0) {
    console.log(chalk.dim(`Skipped ${skippedCount} files/directories`));
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
