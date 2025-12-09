import pLimit from "p-limit";
import type { FullsendFile, FullsendLoadedFile } from "../types.js";
import fs from "node:fs/promises";

export async function readFiles(
  files: FullsendFile[],
  options: { maxFileSize: number; concurrency: number }
) {
  const limit = pLimit(options.concurrency);

  const loadedFiles: FullsendLoadedFile[] = [];
  const skippedFiles: FullsendFile[] = [];
  const failedFiles: { file: FullsendFile; error: unknown }[] = [];

  const tasks = files.map((file) =>
    limit(async () => {
      try {
        // Skip files that are too large
        if (file.size > options.maxFileSize) {
          skippedFiles.push(file);
          return;
        }

        const fileContent = await fs.readFile(file.path, "utf8");

        // Binary files are skipped
        if (fileContent.includes("\0")) {
          skippedFiles.push(file);
          return;
        }

        loadedFiles.push({
          ...file,
          content: fileContent,
        });
      } catch (error) {
        failedFiles.push({ file, error });
      }
    })
  );

  await Promise.all(tasks);

  return { loadedFiles, skippedFiles, failedFiles };
}
