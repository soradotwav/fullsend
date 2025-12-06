import type { FullsendFile } from "../types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { createFilter } from "./filter.js";
import { DEBUG } from "../config/index.js";

/**
 * Scans a directory and its subdirectories, adding files to the files array.
 *
 * @param rootDirectory - The root directory to scan
 * @param options - Optional options object
 * @param options.onEvent - Optional callback function to be called when a file is processed
 * @param options.useGitIgnore - Whether to respect .gitignore files (default: true)
 * @returns A promise that resolves to an array of FullsendFile objects
 */
export async function scanDirectory(
  rootDirectory: string,
  options: {
    onEvent?: (path: string) => void;
    useGitIgnore?: boolean;
  } = {}
): Promise<FullsendFile[]> {
  const files: FullsendFile[] = [];
  const absoluteRoot = path.resolve(rootDirectory);

  const filter = await createFilter(absoluteRoot, options.useGitIgnore ?? true);

  async function walk(currentDir: string, relativeDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const absolutePath = path.join(currentDir, entry.name);
        const relativePath = relativeDir
          ? path.join(relativeDir, entry.name)
          : entry.name;

        // Check filter against relative path
        if (filter.ignores(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(absolutePath, relativePath);
          if (DEBUG) {
            console.log(`Scanned directory ${absolutePath}`);
          }
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(absolutePath);
            files.push({
              path: absolutePath,
              relativePath: relativePath,
              size: stats.size,
            });

            options.onEvent?.(relativePath);
          } catch (error) {
            if (DEBUG) {
              console.error(`Error stating file ${absolutePath}:`, error);
            }
          }
        }
      }
    } catch (error) {
      if (DEBUG) {
        console.error(`Error reading directory ${currentDir}:`, error);
      }
    }
  }

  await walk(absoluteRoot, "");

  return files;
}
