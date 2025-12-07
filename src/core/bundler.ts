import { getFormatter } from "../formatter/index.js";
import type {
  FullsendConfig,
  FullsendResult,
  LightweightFile,
} from "../types.js";
import { readFiles } from "./reader.js";
import { scanDirectory } from "./scanner.js";

/**
 * Bundles a project into a single file
 * @param projectRoot The root directory of the project
 * @param config The configuration for the bundler
 * @returns The result of the bundling process
 */
export async function bundle(
  projectRoot: string,
  config: FullsendConfig
): Promise<FullsendResult> {
  const startTime = Date.now();

  const fileScan = await scanDirectory(projectRoot);

  const files = await readFiles(fileScan, {
    maxFileSize: config.maxFileSize,
    concurrency: 20,
  });

  const formatter = getFormatter(config.format);
  const output = formatter(files.loadedFiles);

  const loaded: LightweightFile[] = files.loadedFiles.map((f) => ({
    path: f.relativePath,
    size: f.size,
    status: "loaded",
  }));

  const skipped: LightweightFile[] = files.skippedFiles.map((f) => ({
    path: f.relativePath,
    size: f.size,
    status: "skipped",
  }));

  const failed: LightweightFile[] = files.failedFiles.map((f) => ({
    path: f.file.relativePath,
    size: f.file.size,
    status: "failed",
  }));

  return {
    files: [...loaded, ...skipped, ...failed],
    output,
    metadata: {
      totalTokens: -1, // TODO: Calculate this
      filesSkipped: files.skippedFiles.length,
      duration: Date.now() - startTime,
    },
  };
}
