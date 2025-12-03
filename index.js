#!/usr/bin/env node

import { Command } from "commander";
import clipboardy from "clipboardy";
import fs from "fs/promises";
import path from "path";
import { scanDirectory } from "./lib/scanner.js";
import { formatOutput } from "./lib/formatter.js";
import { generateTree } from "./lib/tree.js";
import { countTokens } from "./lib/token-counter.js";
import { createProgress, yieldToEventLoop } from "./lib/ui.js";

const program = new Command();

program
  .name("fullsend")
  .description("Send your entire codebase to AI chat interfaces")
  .version("1.1.0")
  .argument("<directory>", "Directory to scan")
  .option("-o, --output <file>", "Output to file instead of clipboard")
  .option("-x, --xml", "Output in XML format (optimized for Claude)")
  .option("--tree", "Include file tree in output")
  .option("--no-gitignore", "Don't use .gitignore patterns")
  .option("--dry-run", "Preview files without generating output")
  .option("--verbose", "Show detailed information")
  .action(async (directory, options) => {
    const progress = createProgress();

    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
      progress.stop();
      console.log("\n");
      console.log("  ✖ Cancelled");
      console.log("\n");
      process.exit(1);
    });

    const startTime = Date.now();

    try {
      const targetDir = path.resolve(directory);

      try {
        await fs.access(targetDir);
      } catch {
        progress.fail(`Directory not found: ${targetDir}`);
        process.exit(1);
      }

      // 1. Scanning
      progress.start("Scanning");

      let fileCount = 0;
      let lastUpdate = Date.now();

      const { files, metadata } = await scanDirectory(targetDir, [], {
        useGitignore: options.gitignore !== false,
        onProgress: () => {
          fileCount++;
          const now = Date.now();
          if (now - lastUpdate > 100) {
            progress.update("Scanning", `${fileCount.toLocaleString()} files`);
            lastUpdate = now;
            if (fileCount > 10000) progress.setWarning(true);
          }
        },
      });

      if (files.length === 0) {
        progress.fail("No files found");
        process.exit(0);
      }

      progress.setWarning(false);

      // 2. Dry Run
      if (options.dryRun) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        progress.succeed({
          files,
          size: files.reduce((acc, f) => acc + f.size, 0),
          tokens: 0,
          destination: null,
          elapsed,
          dryRun: true,
          fileList: files, // Pass files for tree rendering
          tree: true, // Force tree show on dry run
        });
        process.exit(0);
      }

      // 3. Formatting
      progress.update("Formatting");
      await yieldToEventLoop();

      // Generate full text tree for the OUTPUT content
      let fileTree = "";
      if (options.tree) {
        fileTree = generateTree(targetDir, files, false);
      }

      const output = await formatOutput(
        {
          files,
          fileTree,
          baseDir: targetDir,
        },
        { xml: options.xml }
      );

      // 4. Counting tokens
      progress.update("Counting tokens");
      const tokenCount = await countTokens(output);

      // 5. Output
      progress.update("Copying");
      await yieldToEventLoop();

      let destination = "Clipboard";
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, output, "utf-8");
        destination = path.basename(outputPath);
      } else {
        try {
          await clipboardy.write(output);
        } catch {
          const fallbackPath = path.join(process.cwd(), "fullsend-output.txt");
          await fs.writeFile(fallbackPath, output, "utf-8");
          destination = path.basename(fallbackPath);
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      progress.succeed({
        files,
        size: Buffer.byteLength(output, "utf-8"),
        tokens: tokenCount,
        destination,
        elapsed,
        dryRun: false,
        tree: options.tree,
        fileList: files,
      });
    } catch (error) {
      progress.fail(error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();
