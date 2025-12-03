import chalk from "chalk";
import ora from "ora";
import path from "path";

// --- CONFIGURATION ---
const TREE_DISPLAY_LIMIT = 20; // Max lines of tree to show in console

const COLORS = {
  dim: [161, 161, 170], // zinc-400
  dimmer: [82, 82, 91], // zinc-600
  success: [34, 197, 94], // green-500
  error: [239, 68, 68], // red-500
  warning: [234, 179, 8], // yellow-500
  text: [250, 250, 250], // zinc-50
  accent: [56, 189, 248], // sky-400
};

function rgb(colorName) {
  return chalk.rgb(...COLORS[colorName]);
}

function stripAnsi(str) {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatCompactNumber(num) {
  const formatter = Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return formatter.format(num).toLowerCase();
}

// --- PROGRESS SPINNER (Grid Style Loading) ---

export function createProgress() {
  let spinner = null;
  let interval = null;
  let frame = 0;
  let start = Date.now();
  let currentText = "";
  let currentMeta = "";
  let isWarning = false;

  const renderLine = () => {
    if (!spinner) return;

    const elapsed = ((Date.now() - start) / 1000).toFixed(1) + "s";

    // Breathing Text Effect
    const t = (Math.sin(frame / 8) + 1) / 2;
    const gray = Math.floor(120 + t * 100);
    let textColor = chalk.rgb(gray, gray, gray);

    if (isWarning) textColor = rgb("warning");

    const meta = currentMeta ? ` ${rgb("dimmer")(currentMeta)}` : "";
    const time = rgb("dimmer")(elapsed);

    // Clean, minimal loading line
    const line = `${textColor(currentText)}${meta}`;

    const plainLeft = stripAnsi(line);
    const width = process.stdout.columns || 80;
    const padding = Math.max(2, width - plainLeft.length - time.length - 2);

    spinner.text = line + " ".repeat(padding) + time;
    frame++;
  };

  return {
    start(msg) {
      currentText = msg;
      currentMeta = "";
      start = Date.now();
      frame = 0;

      spinner = ora({
        spinner: "dots",
        color: "gray",
        discardStdin: false,
      }).start();

      interval = setInterval(renderLine, 80);
      renderLine();
    },

    update(msg, meta = "") {
      currentText = msg;
      currentMeta = meta;
      renderLine();
    },

    setWarning(warn) {
      isWarning = warn;
    },

    stop() {
      if (interval) clearInterval(interval);
      if (spinner) {
        spinner.stop();
        process.stdout.write("\r\x1b[K"); // Clear line
      }
    },

    succeed(data) {
      this.stop();
      renderPipeline(data);
    },

    fail(msg) {
      this.stop();
      console.log("");
      console.log(`  ${rgb("error")("✗")} ${msg}`);
      console.log("");
    },
  };
}

// --- FINAL SUMMARY (Pipeline Style) ---

function renderPipeline(data) {
  const { files, size, tokens, destination, elapsed, dryRun, tree, fileList } =
    data;
  const dim = rgb("dim");
  const dimmer = rgb("dimmer");

  console.log("");

  // 1. Header
  console.log(`  ${dimmer("┌")}  ${chalk.bold("fullsend")}`);
  console.log(`  ${dimmer("│")}`);

  // 2. Stats
  const count = formatCompactNumber(files.length);
  const sizeStr = formatSize(size);
  const tokenStr = formatCompactNumber(tokens);

  console.log(`  ${dimmer("◇")}  ${count} files scanned`);
  console.log(`  ${dimmer("│")}  ${dim(sizeStr)} processed`);

  if (!dryRun) {
    console.log(`  ${dimmer("│")}  ${dim(tokenStr + " tokens generated")}`);
  }

  // 3. Tree (Integrated into pipeline)
  if ((tree || dryRun) && fileList && fileList.length > 0) {
    console.log(`  ${dimmer("│")}`);
    const treeLines = generatePipelineTree(fileList);
    treeLines.forEach((line) => console.log(line));
  }

  console.log(`  ${dimmer("│")}`);

  // 4. Footer
  const destName = dryRun ? "Dry Run Complete" : destination;
  const icon = dryRun ? "○" : "└→";
  const actionColor = dryRun ? dim : rgb("success");

  console.log(`  ${actionColor(icon)} ${chalk.white(destName)}`);
  console.log(`     ${dimmer(elapsed + "s")}`);
  console.log("");
}

function generatePipelineTree(files) {
  const dimmer = rgb("dimmer");
  const dim = rgb("dim");
  const output = [];

  // 1. Build simplistic object tree
  const tree = {};
  files.forEach((file) => {
    const parts = file.relativePath.split(path.sep);
    let current = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) current[part] = null;
      else {
        current[part] = current[part] || {};
        current = current[part];
      }
    });
  });

  // 2. Flatten to printable lines
  let linesCounter = 0;
  let truncated = false;

  function traverse(node, prefix = "") {
    if (truncated) return;

    const entries = Object.entries(node).sort(([a, aVal], [b, bVal]) => {
      if (aVal && !bVal) return -1;
      if (!aVal && bVal) return 1;
      return a.localeCompare(b);
    });

    entries.forEach(([name, val], index) => {
      if (truncated) return;
      if (linesCounter >= TREE_DISPLAY_LIMIT) {
        truncated = true;
        return;
      }

      const isLast = index === entries.length - 1;
      const marker = isLast ? "└─ " : "├─ ";
      const pipePrefix = `  ${dimmer("│")}  `; // The pipeline rail

      const linePrefix = prefix + marker;
      const coloredName = val ? chalk.blue(name + "/") : dim(name);

      output.push(`${pipePrefix}${dimmer(prefix + marker)}${coloredName}`);
      linesCounter++;

      if (val) {
        const childPrefix = prefix + (isLast ? "   " : "│  ");
        traverse(val, childPrefix);
      }
    });
  }

  traverse(tree);

  if (truncated) {
    const remaining = files.length - linesCounter; // Rough estimate
    output.push(`  ${dimmer("│")}  ${dimmer(`... and ${remaining} more`)}`);
  }

  return output;
}

export function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}
