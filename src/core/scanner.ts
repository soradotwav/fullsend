import type { FullsendFile } from "../types.js";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Scans a directory and its subdirectories, adding files to the files array.
 *
 * @param rootDirectory - The root directory to scan
 * @param options - Optional options object
 * @param options.onEvent - Optional callback function to be called when a file is processed
 * @returns A promise that resolves to an array of FullsendFile objects
 */
export async function scanDirectory(
  rootDirectory: string,
  options: { onEvent?: (path: string) => void }
): Promise<FullsendFile[]> {
  const files: FullsendFile[] = [];
  const absoluteRoot = path.resolve(rootDirectory);

  /**
   * Recursively scans a directory and its subdirectories, adding files to the files array.
   *
   * @param currentDir - The absolute path of the directory to scan
   * @param relativeDir - The relative path of the directory to scan
   */
  async function walk(currentDir: string, relativeDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        // Get the absolute and relative paths of the entry
        const absolutePath = path.join(currentDir, entry.name);
        const relativePath = path.join(relativeDir, entry.name);

        // If the entry is a directory, recursively scan it
        if (entry.isDirectory()) {
          await walk(absolutePath, relativePath);
          console.log(`Scanned directory ${relativePath}`);
        }
        // If the entry is a file, add it to the files array
        else if (entry.isFile()) {
          try {
            const stats = await fs.stat(absolutePath);
            files.push({
              path: absolutePath,
              relativePath: relativePath,
              size: stats.size,
            });

            // Call the onEvent callback if provided
            options.onEvent?.(relativePath);
          } catch (error) {
            console.error(`Error reading file ${absolutePath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentDir}:`, error);
    }
  }

  await walk(absoluteRoot, "");

  return files;
}
