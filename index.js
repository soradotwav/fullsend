#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import clipboardy from "clipboardy";
import ora from "ora";
import fs from "fs/promises";
import path from "path";
import { scanDirectory } from "./lib/scanner.js";
import { formatOutput } from "./lib/formatter.js";
import { generateTree } from "./lib/tree.js";
import { countTokens } from "./lib/token-counter.js";

const program = new Command();

program
  .name("fullsend")
  .description("Send your entire codebase to AI chat interfaces")
  .version("1.0.0")
  .argument("<directory>", "Directory to scan")
  .option("-o, --output <file>", "Output to file instead of clipboard")
  .option("--no-tree", "Exclude file tree from output")
  .option("--no-gitignore", "Don't use .gitignore patterns")
  .option("--dry-run", "Preview files without generating output")
  .option("--verbose", "Show detailed information")
  .action(async (directory, options) => {
    const spinner = ora("Initializing...").start();

    try {
      const targetDir = path.resolve(directory);

      // Check if directory exists
      try {
        await fs.access(targetDir);
      } catch {
        spinner.fail(chalk.red(`Directory not found: ${targetDir}`));
        process.exit(1);
      }

      // Scan directory
      spinner.text = "Scanning files...";
      const files = await scanDirectory(targetDir, [], {
        useGitignore: options.gitignore !== false,
        verbose: options.verbose,
      });

      if (files.length === 0) {
        spinner.fail(chalk.yellow("No files found"));
        process.exit(0);
      }

      spinner.succeed(chalk.green(`Found ${files.length} files`));

      // Calculate total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      console.log(chalk.dim(`Total size: ${(totalSize / 1024).toFixed(1)} KB`));

      // Dry run mode
      if (options.dryRun) {
        console.log(chalk.cyan("\nFiles to be included:"));
        files.forEach((file) => {
          console.log(
            chalk.dim(
              `  ${file.relativePath} (${(file.size / 1024).toFixed(1)} KB)`
            )
          );
        });
        process.exit(0);
      }

      // Generate file tree
      let fileTree = "";
      if (options.tree !== false) {
        console.log(chalk.cyan("\nFile Structure:"));
        const coloredTree = generateTree(targetDir, files, true);
        console.log(coloredTree);
        fileTree = generateTree(targetDir, files, false);
      }

      // Format output
      const formattingSpinner = ora("Formatting output...").start();
      const output = await formatOutput({
        files,
        fileTree,
        baseDir: targetDir,
      });

      const tokenCount = await countTokens(output);

      formattingSpinner.succeed(chalk.green("Formatting complete"));

      // Output result
      const outputSize = Buffer.byteLength(output, "utf-8");
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, output, "utf-8");
        console.log(chalk.green(`Output saved to: ${outputPath}`));
      } else {
        try {
          await clipboardy.write(output);
          console.log(chalk.green("Output copied to clipboard"));
        } catch (clipError) {
          const fallbackPath = path.join(process.cwd(), "fullsend-output.txt");
          await fs.writeFile(fallbackPath, output, "utf-8");
          console.log(
            chalk.yellow(`Clipboard unavailable. Saved to: ${fallbackPath}`)
          );
        }
      }

      // Show final metrics
      console.log(
        chalk.dim(`Output size: ${(outputSize / 1024).toFixed(1)} KB`)
      );
      console.log(
        chalk.dim(`Tokens (GPT-4/Claude): ${tokenCount.toLocaleString()}`)
      );

      if (options.verbose) {
        console.log(chalk.dim(`\nProcessed directory: ${targetDir}`));
        console.log(chalk.dim(`Files included: ${files.length}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();
