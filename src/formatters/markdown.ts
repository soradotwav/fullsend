import type { FullsendLoadedFile, FullsendFile } from "../types.js";
import { generateTree } from "../utils/tree.js";
import { getLanguageFromFile } from "./languages.js";

/**
 * Formats an array of loaded files into a markdown string.
 * Each file is formatted as a code block with its language.
 *
 * @param files - Array of loaded files to format
 * @param showTree - Whether to include the file tree
 * @param allFiles - All files including filtered ones for complete tree
 * @returns Markdown string containing formatted files
 */
export function formatMarkdown(
  files: FullsendLoadedFile[],
  showTree?: boolean,
  allFiles?: FullsendFile[]
) {
  let output = "";

  if (showTree) {
    // Use allFiles if provided (includes filtered), otherwise fall back to loaded files
    const treeFiles = allFiles || files;
    output += `## File Structure\n\n\`\`\`text\n${generateTree(treeFiles, {
      showFiltered: true,
    })}\`\`\`\n\n`;
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
