import type { Command } from "commander";
import { loadConfig } from "../../config/index.js";
import { createSpinner } from "../ui/progress.js";
import type { FullsendConfig } from "../../types.js";
import { bundle } from "../../core/bundler.js";
import fs from "node:fs/promises";
import { renderEmpty, renderSuccess } from "../ui/output.js";
import clipboardy from "clipboardy";

interface BundleOptions {
  output?: string;
  format?: "markdown" | "xml";
  verbose?: boolean;
  dryRun?: boolean;
  gitignore?: boolean;
  showTree?: boolean;
  maxSize?: string;
}

export function bundleCommand(program: Command) {
  program
    .argument("[directory]", "Directory to scan", ".")
    .option("-o, --output <file>", "Output file path")
    .option("-f, --format <format>", "Output format (markdown or xml)")
    .option("-v, --verbose", "Verbose output")
    .option("-d, --dry-run", "Dry run (skip output)")
    .option("--no-gitignore", "Disable .gitignore")
    .option("-t, --show-tree", "Show file tree in final output")
    .option("-m, --max-size <size>", "Max file size to process (in MB)")
    .action(async (directory: string, options: BundleOptions) => {
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
        useGitIgnore: options.gitignore,
        showFileTree: options.showTree,
        maxFileSize: options.maxSize
          ? parseInt(options.maxSize) * 1024 * 1024
          : undefined,
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

        if (result.files.filter((f) => f.status === "loaded").length === 0) {
          renderEmpty();
          return;
        }

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
