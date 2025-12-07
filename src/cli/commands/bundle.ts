import type { Command } from "commander";
import { loadConfig } from "../../config/index.js";
import { createSpinner } from "../ui/progress.js";
import type { FullsendConfig } from "../../types.js";
import { bundle } from "../../core/bundler.js";
import fs from "node:fs/promises";
import { renderSuccess } from "../ui/output.js";
import clipboardy from "clipboardy";
import { DEFAULT_USER_CONFIG } from "../../config/index.js";

export function bundleCommand(program: Command) {
  program
    .argument("[directory]", "Directory to scan", ".")
    .option("-o, --output <file>", "Output file path")
    .option(
      "-f, --format <format>",
      "Output format (markdown or xml)",
      "markdown"
    )
    .option("-v, --verbose", "Verbose output")
    .option("-d, --dry-run", "Dry run (skip output)")
    .option("-g, --use-gitignore", "Use .gitignore", true)
    .option("--no-gitignore", "Disable .gitignore")
    .option("-t, --show-tree", "Show file tree in final output")
    .option("-m, --max-size <size>", "Max file size to process (in MB)", "10")
    .action(async (directory, options) => {
      const spinner = createSpinner();
      spinner.start("Loading config...");

      process.on("SIGINT", () => {
        spinner.fail("Aborted by user.");
        process.exit(1);
      });

      // Map CLI options to UserConfig
      const cliOverrides: Partial<FullsendConfig> = {
        format: options.format,
        verbose: options.verbose,
        useGitIgnore: !options.noGitignore,
        showFileTree: options.showTree,
        maxFileSize: options.maxSize
          ? parseInt(options.maxSize) * 1024 * 1024
          : DEFAULT_USER_CONFIG.maxFileSize,
      };

      // Filter out undefineds so we don't override defaults with undefined
      const cleanOverrides = Object.fromEntries(
        Object.entries(cliOverrides).filter(([_, v]) => v !== undefined)
      );

      const config = await loadConfig(directory, cleanOverrides);

      spinner.update("Scanning & Bundling...");

      try {
        const result = await bundle(directory, config);
        spinner.stop();

        if (options.dryRun) {
          renderSuccess(result, "Dry Run", true);
          return;
        }

        if (options.output) {
          await fs.writeFile(options.output, result.output);
          renderSuccess(result, options.output, false);
        } else {
          await clipboardy.write(result.output);
          renderSuccess(result, "Clipboard", false);
        }
      } catch (error) {
        spinner.fail(
          error instanceof Error ? error.message : "Unknown error occurred"
        );
        if (options.verbose && error instanceof Error) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}
