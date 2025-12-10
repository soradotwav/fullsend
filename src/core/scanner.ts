import type { FullsendFile, ScanResult } from "../types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { createFilter } from "./filter.js";
import { DEBUG } from "../config/index.js";

/**
 * Scans a directory and its subdirectories, collecting both included and filtered files.
 *
 * @param rootDirectory - The root directory to scan
 * @param options - Optional options object
 * @param options.onEvent - Optional callback function to be called when a file is processed
 * @param options.useGitIgnore - Whether to respect .gitignore files (default: true)
 * @returns A promise that resolves to a ScanResult with all files and included files
 */
export async function scanDirectory(
  rootDirectory: string,
  options: {
    onEvent?: (path: string) => void;
    useGitIgnore?: boolean;
  } = {}
): Promise<ScanResult> {
  const allFiles: FullsendFile[] = [];
  const includedFiles: FullsendFile[] = [];
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
        const isFiltered = filter.ignores(relativePath);

        if (entry.isDirectory()) {
          // Always add directories to allFiles (even filtered ones)
          allFiles.push({
            path: absolutePath,
            relativePath: relativePath,
            size: 0,
            isDirectory: true,
            isFiltered,
          });

          // Only walk into non-filtered directories
          if (!isFiltered) {
            await walk(absolutePath, relativePath);
          }
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(absolutePath);

            // Only add non-filtered files to allFiles
            // Filtered files are completely hidden
            if (!isFiltered) {
              const file: FullsendFile = {
                path: absolutePath,
                relativePath: relativePath,
                size: stats.size,
                isFiltered: false,
              };

              allFiles.push(file);
              includedFiles.push({
                path: absolutePath,
                relativePath: relativePath,
                size: stats.size,
              });
              options.onEvent?.(relativePath);
            }
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

  return { allFiles, includedFiles };
}
