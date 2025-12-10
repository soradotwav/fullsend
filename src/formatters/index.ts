import type { FullsendLoadedFile, FullsendFile } from "../types.js";
import { formatXml } from "./xml.js";
import { formatMarkdown } from "./markdown.js";

/**
 * Function type for file formatters
 * @param files The files to format
 * @param showTree Whether to show the file tree
 * @param allFiles All files including filtered ones for tree generation
 * @returns The formatted string
 */
export type Formatter = (
  files: FullsendLoadedFile[],
  showTree?: boolean,
  allFiles?: FullsendFile[],
  addInstruction?: boolean
) => string;

/**
 * Available formatter types
 * Allows for future formatter types to be added without changing the API
 */
export type AvailableFormatters = "xml" | "markdown";

/**
 * Returns a formatter function based on the specified format
 * @param format The format to get the formatter for
 * @returns The formatter function
 */
export function getFormatter(format: AvailableFormatters): Formatter {
  return format === "xml" ? formatXml : formatMarkdown;
}
