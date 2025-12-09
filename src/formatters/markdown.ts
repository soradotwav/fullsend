import type { FullsendLoadedFile } from "../types.js";
import { generateTree } from "../utils/tree.js";
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
export function formatMarkdown(
  files: FullsendLoadedFile[],
  showTree?: boolean
) {
  let output = "";

  if (showTree) {
    output += `## File Structure\n\n\`\`\`text\n${generateTree(
      files
    )}\`\`\`\n\n`;
  }

  output += `## Files\n\n`;

  output += files
    .map((file) => {
      const language = getLanguageFromFile(file.relativePath);
      return `${file.relativePath}:\n\`\`\`${language}\n${file.content}\n\`\`\``;
    })
    .join("\n\n");

  return output;
}
