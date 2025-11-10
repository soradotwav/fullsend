import path from "path";
import chalk from "chalk";

export function generateTree(baseDir, files, useColors = false) {
  const tree = {};

  // Build tree structure
  files.forEach((file) => {
    const parts = file.relativePath.split(path.sep);
    let current = tree;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // It's a file
        current[part] = null;
      } else {
        // It's a directory
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });

  // Generate tree string
  function buildTreeString(node, prefix = "", isLast = true, isRoot = true) {
    let result = "";
    const entries = Object.entries(node).sort(([a, aVal], [b, bVal]) => {
      // Directories first, then files
      const aIsDir = aVal !== null;
      const bIsDir = bVal !== null;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    entries.forEach(([name, value], index) => {
      const isLastEntry = index === entries.length - 1;
      const isDirectory = value !== null;

      if (!isRoot) {
        result += prefix;
        result += isLastEntry ? "└── " : "├── ";
      }

      if (isDirectory) {
        const dirName = name + "/";
        result += useColors ? chalk.blue(dirName) : dirName;
        result += "\n";
        const newPrefix = isRoot
          ? ""
          : prefix + (isLastEntry ? "    " : "│   ");
        result += buildTreeString(value, newPrefix, isLastEntry, false);
      } else {
        result += useColors ? chalk.green(name) : name;
        result += "\n";
      }
    });

    return result;
  }

  return buildTreeString(tree);
}
