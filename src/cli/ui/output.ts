import type { FullsendResult } from "../../types.js";
import { colors } from "./colors.js";

/**
 * Formats bytes into human readable string
 * @param bytes Number of bytes
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats large numbers compactly (e.g. 1200 -> 1.2k)
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(num)
    .toLowerCase();
}

/**
 * Renders the success summary to the console.
 *
 * @param result - The bundle result data
 * @param destination - Where the output went ("Clipboard", "file.txt", or "Dry Run")
 * @param isDryRun - Whether this was a dry run
 */
export function renderSuccess(
  result: FullsendResult,
  destination: string,
  isDryRun: boolean
) {
  const { dimmer, dim, success, warning } = colors;
  const { metadata, files } = result;

  // Calculate total size of processed files
  // Note: We sum the size of 'loaded' files.
  // LightweightFile has 'size', so we can reduce it.
  const processedFiles = files.filter((f) => f.status === "loaded");
  const totalSize = processedFiles.reduce((acc, f) => acc + f.size, 0);

  console.log(""); // Spacer

  // 1. Header
  console.log(`  ${dimmer("┌")}  ${colors.text("fullsend")}`);
  console.log(`  ${dimmer("│")}`);

  // 2. Stats
  const countStr = formatNumber(processedFiles.length);
  const sizeStr = formatSize(totalSize);

  console.log(`  ${dimmer("◇")}  ${countStr} files bundled`);
  console.log(`  ${dimmer("│")}  ${dim(sizeStr)} processed`);

  // Tokens (only if not dry run, usually)
  if (!isDryRun && metadata.totalTokens > 0) {
    const tokenStr = formatNumber(metadata.totalTokens);
    console.log(`  ${dimmer("│")}  ${dim(`${tokenStr} tokens generated`)}`);
  }

  // Skipped info (if significant)
  if (metadata.filesSkipped > 0) {
    const skippedStr = formatNumber(metadata.filesSkipped);
    console.log(`  ${dimmer("│")}  ${dim(`${skippedStr} files skipped`)}`);
  }

  console.log(`  ${dimmer("│")}`);

  // 3. Footer / Action
  const icon = isDryRun ? "○" : "└→";
  const actionColor = isDryRun ? warning : success;
  const destLabel = isDryRun ? "Dry Run Complete" : destination;

  console.log(`  ${actionColor(icon)} ${colors.text(destLabel)}`);

  const elapsed = (metadata.duration / 1000).toFixed(2);
  console.log(`     ${dimmer(`${elapsed}s`)}`);

  console.log(""); // Spacer
}

/**
 * Renders a simple error message
 */
export function renderError(message: string) {
  console.log(`\n  ${colors.error("✖")} ${message}\n`);
}
