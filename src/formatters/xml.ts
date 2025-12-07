import type { FullsendLoadedFile } from "../types.js";
import { generateTree } from "../utils/tree.js";

/**
 * Escapes a string for use in an XML attribute.
 *
 * @param str - The string to escape
 * @returns The escaped string
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
 *
 * @param str - The string to escape
 * @returns The escaped string
 */
function escapeCDATA(str: string): string {
  return str.replace(/]]>/g, "]]]]><![CDATA[>");
}

/**
 * Formats an array of loaded files into an XML string.
 * Each file is formatted as a file element with its content.
 *
 * The XML string is formatted as follows:
 *
 * ```xml
 * <codebase>
 *   <file path="relative/path/to/file"><![CDATA[{file content}]]></file>
 *   ...
 * </codebase>
 * ```
 *
 * @param files - Array of loaded files to format
 * @returns XML string containing formatted files
 */
export function formatXml(files: FullsendLoadedFile[], showTree?: boolean) {
  const fileElements = files
    .map((file) => {
      const safePath = escapeXMLAttribute(file.relativePath);
      const safeContent = escapeCDATA(file.content);

      return `<file path="${safePath}"><![CDATA[${safeContent}]]></file>`;
    })
    .join("\n");

  let output = "<codebase>\n";

  if (showTree) {
    output += `<structure><![CDATA[\n${escapeCDATA(
      generateTree(files)
    )}]]></structure>\n`;
  }

  output += `${fileElements}\n</codebase>`;

  return output;
}
