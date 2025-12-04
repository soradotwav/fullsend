import chalk from "chalk";
import ora from "ora";
import path from "path";

const TREE_DISPLAY_LIMIT = 20;

const COLORS = {
  dim: [161, 161, 170],
  dimmer: [82, 82, 91],
  success: [34, 197, 94],
  error: [239, 68, 68],
  warning: [234, 179, 8],
  text: [250, 250, 250],
  accent: [56, 189, 248],
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

    const t = (Math.sin(frame / 8) + 1) / 2;
    const gray = Math.floor(120 + t * 100);
    let textColor = chalk.rgb(gray, gray, gray);

    if (isWarning) textColor = rgb("warning");

    const meta = currentMeta ? ` ${rgb("dimmer")(currentMeta)}` : "";
    const time = rgb("dimmer")(elapsed);

    const line = `${textColor(currentText)}${meta}`;

    const plainLeft = stripAnsi(line);
    const plainTime = stripAnsi(time);

    const width = process.stdout.columns || 80;
    const availableSpace = width - plainTime.length - 2;

    let displayText = line;

    if (plainLeft.length > availableSpace) {
      const truncated =
        stripAnsi(currentText).slice(0, availableSpace - meta.length - 3) +
        "...";
      displayText = `${textColor(truncated)}${meta}`;
    }

    const padding = Math.max(
      2,
      width - stripAnsi(displayText).length - plainTime.length - 2
    );

    spinner.text = displayText + " ".repeat(padding) + time;
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
        process.stdout.write("\r\x1b[K");
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

  let linesCounter = 0;
  let filesPrinted = 0;
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
      const pipePrefix = `  ${dimmer("│")}  `;
      const linePrefix = prefix + marker;

      const coloredName = val ? chalk.blue(name + "/") : dim(name);

      output.push(`${pipePrefix}${dimmer(linePrefix)}${coloredName}`);
      linesCounter++;

      if (val) {
        // Directory
        const childPrefix = prefix + (isLast ? "   " : "│  ");
        traverse(val, childPrefix);
      } else {
        // File
        filesPrinted++;
      }
    });
  }

  traverse(tree);

  if (truncated) {
    const remaining = Math.max(0, files.length - filesPrinted);
    output.push(
      `  ${dimmer("│")}  ${dimmer(`... and ${remaining} more files`)}`
    );
  }

  return output;
}

export function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}
