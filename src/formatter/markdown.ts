import type { FullsendLoadedFile } from "../types.js";
import { getLanguageFromFile } from "./languages.js";

/**
 * Formats an array of loaded files into a markdown string.
 * Each file is formatted as a code block with its language.
 *
 * The markdown string is formatted as follows:
 *
 * ````markdown
 * relative/path/to/file:
 * ```language
 * {file content}
 * ```
 * ````
 *
 * @param files - Array of loaded files to format
 * @returns Markdown string containing formatted files
 */
export function formatMarkdown(files: FullsendLoadedFile[]) {
  return files
    .map((file) => {
      const language = getLanguageFromFile(file.relativePath);
      return `${file.relativePath}:\n\`\`\`${language}\n${file.content}\n\`\`\``;
    })
    .join("\n\n");
}
