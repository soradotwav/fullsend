import { type Command } from "commander";
import {
  intro,
  outro,
  cancel,
  select,
  isCancel,
  confirm,
  text,
  note,
} from "@clack/prompts";
import {
  DEFAULT_USER_CONFIG,
  loadConfigFromDisk,
  saveConfigToDisk,
} from "../../config/index.js";
import { colors } from "../ui/colors.js";
import type { UserConfig } from "../../types.js";

export function configCommand(program: Command) {
  program
    .command("config")
    .description("Manage Fullsend configuration")
    .action(async () => {
      const { dim } = colors;
      console.log();
      intro(colors.accent("fullsend config"));

      const config = await loadConfigFromDisk();

      if (config) {
        note("Loaded existing configuration", "Config");
      } else {
        note("No config found, using defaults", "Config");
      }

      // Format
      const format = await select({
        message: "Output format",
        options: [
          { label: "Markdown", value: "markdown", hint: "default" },
          { label: "XML", value: "xml" },
        ],
        initialValue: config?.format ?? "markdown",
      });

      if (isCancel(format)) {
        cancel("Configuration cancelled");
        return;
      }

      // Show file tree
      const showFileTree = await confirm({
        message: "Include file tree in output?",
        initialValue: config?.showFileTree ?? false,
      });

      if (isCancel(showFileTree)) {
        cancel("Configuration cancelled");
        return;
      }

      // Use gitignore
      const useGitIgnore = await confirm({
        message: "Use .gitignore patterns?",
        initialValue: config?.useGitIgnore ?? true,
      });

      if (isCancel(useGitIgnore)) {
        cancel("Configuration cancelled");
        return;
      }

      // Max file size
      const currentMaxSize =
        (config?.maxFileSize ?? DEFAULT_USER_CONFIG.maxFileSize) / 1024 / 1024;
      const maxFileSize = await text({
        message: "Max file size (MB)",
        placeholder: String(currentMaxSize),
        defaultValue: String(currentMaxSize),
        validate: (value) => {
          const num = parseInt(value);
          if (isNaN(num)) return "Enter a valid number";
          if (num <= 0) return "Must be greater than 0";
          return;
        },
      });

      if (isCancel(maxFileSize)) {
        cancel("Configuration cancelled");
        return;
      }

      // Verbose
      const verbose = await confirm({
        message: "Enable verbose logging?",
        initialValue: config?.verbose ?? false,
      });

      if (isCancel(verbose)) {
        cancel("Configuration cancelled");
        return;
      }

      // Add XML output instruction
      const addXmlOutputInstruction = await confirm({
        message:
          "Add instruction to prevent AI from mirroring XML output format?",
        initialValue: config?.addXmlOutputInstruction ?? true,
      });

      if (isCancel(addXmlOutputInstruction)) {
        cancel("Configuration cancelled");
        return;
      }

      // Save
      const modifiedConfig: UserConfig = {
        format,
        showFileTree,
        useGitIgnore,
        maxFileSize: parseInt(maxFileSize) * 1024 * 1024,
        verbose,
        addXmlOutputInstruction,
      };

      const saved = await saveConfigToDisk(modifiedConfig);

      if (saved) {
        outro(dim("Saved to ~/.fullsendrc"));
      } else {
        cancel("Failed to save configuration");
      }
    });
}
