import type { FullsendLoadedFile, FullsendFile } from "../types.js";
import { generateTree } from "../utils/tree.js";

/**
 * Escapes a string for use in an XML attribute.
 */
function escapeXMLAttribute(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escapes a string for use in a CDATA section.
 */
function escapeCDATA(str: string): string {
  return str.replace(/]]>/g, "]]]]><![CDATA[>");
}

const INSTRUCTION_TEXT =
  "Note: This is the codebase context. When responding, please do NOT mirror this format. Reply in standard Markdown unless the user requests otherwise.";

/**
 * Formats an array of loaded files into an XML string.
 *
 * @param files - Array of loaded files to format
 * @param showTree - Whether to include the file tree
 * @param allFiles - All files including filtered ones for complete tree
 * @returns XML string containing formatted files
 */
export function formatXml(
  files: FullsendLoadedFile[],
  showTree?: boolean,
  allFiles?: FullsendFile[],
  addInstruction?: boolean
) {
  const fileElements = files
    .map((file) => {
      const safePath = escapeXMLAttribute(file.relativePath);
      const safeContent = escapeCDATA(file.content);

      return `<file path="${safePath}"><![CDATA[${safeContent}]]></file>`;
    })
    .join("\n");

  let output = "<codebase>\n";

  // Add instruction to prevent AI from mirroring output format. This is added to the XML output.
  if (addInstruction) {
    output += `<note>${INSTRUCTION_TEXT}</note>\n`;
  }

  if (showTree) {
    // Use allFiles if provided (includes filtered), otherwise fall back to loaded files
    const treeFiles = allFiles || files;
    output += `<structure><![CDATA[\n${escapeCDATA(
      generateTree(treeFiles)
    )}]]></structure>\n`;
  }

  output += `${fileElements}\n</codebase>`;

  return output;
}
