import type { FullsendFile } from "../types.js";

interface TreeNode {
  [key: string]: TreeNode | null;
}

interface TreeOptions {
  limit?: number;
  showFiltered?: boolean;
}

/**
 * Generates a tree from a list of files
 *
 * @param files The files to generate a tree from
 * @param options Configuration options
 * @returns The generated tree string
 */
export function generateTree(
  files: FullsendFile[],
  options: TreeOptions = {}
): string {
  const tree: TreeNode = {};
  // Track filtered directories separately
  const filteredDirs = new Set<string>();

  // Build the tree
  for (const file of files) {
    const path = file.relativePath.split("/");
    let current = tree;
    let currentPath = "";

    // Check each part of the path
    for (let i = 0; i < path.length; i++) {
      const part = path[i];

      // Safety check; Should never happen but lets typescript know it can't be undefined
      if (!part) continue;

      currentPath = currentPath ? `${currentPath}/${part}` : part;

      // If we're at the last part
      if (i === path.length - 1) {
        if (file.isDirectory) {
          // Create directory node
          if (!current[part]) {
            current[part] = {};
          }
          // Track if this directory is filtered
          if (file.isFiltered) {
            filteredDirs.add(file.relativePath);
          }
        } else {
          // It's a file - only add if not filtered
          current[part] = null;
        }
      } else {
        // If the part doesn't exist, we create it
        if (!current[part]) {
          current[part] = {};
        }

        current = current[part];
      }
    }
  }

  let lineCount = 0;
  let truncated = false;
  // Default limit if not provided
  const limit = options.limit ?? Infinity;

  /**
   * Count all items in a node recursively
   */
  function countItems(node: TreeNode): number {
    let count = 0;
    for (const [_, value] of Object.entries(node)) {
      count++;
      if (value !== null) {
        count += countItems(value);
      }
    }
    return count;
  }

  /**
   * Recursively renders the tree
   *
   * @param currentNode The current node to render
   * @param currentPrefix The current prefix to use
   * @param currentPath The current path for checking filtered status
   * @returns The rendered tree
   */
  function render(
    currentNode: TreeNode,
    currentPrefix: string = "",
    currentPath: string = ""
  ): string {
    if (truncated) return "";

    let result = "";

    // Sort: Directories first, then alphabetical
    const entries = Object.entries(currentNode).sort(
      ([nameA, nodeA], [nameB, nodeB]) => {
        const isDirA = nodeA !== null;
        const isDirB = nodeB !== null;

        if (isDirA === isDirB) return nameA.localeCompare(nameB);
        return isDirA ? -1 : 1;
      }
    );

    // Render each entry
    for (let i = 0; i < entries.length; i++) {
      // Check limit before adding new line
      if (lineCount >= limit) {
        if (!truncated) {
          truncated = true;
          // Count remaining items at this level and below
          let remainingCount = entries.length - i;
          for (let j = i; j < entries.length; j++) {
            const [_, node] = entries[j]!;
            if (node !== null) {
              remainingCount += countItems(node);
            }
          }
          result += `${currentPrefix}└── ... (${remainingCount} more items)\n`;
        }
        return result;
      }

      const [itemName, itemNode] = entries[i]!;
      const isLastItem = i === entries.length - 1;
      const connector = isLastItem ? "└── " : "├── ";
      const isDirectory = itemNode !== null;

      // Build the full path for this item
      const itemPath = currentPath ? `${currentPath}/${itemName}` : itemName;

      // Check if this directory is filtered
      const isFiltered = isDirectory && filteredDirs.has(itemPath);

      if (isFiltered) {
        // Show filtered directories as "dirname/..."
        result += `${currentPrefix}${connector}${itemName}/...\n`;
      } else if (isDirectory) {
        // Regular directory
        result += `${currentPrefix}${connector}${itemName}/\n`;
      } else {
        // Regular file
        result += `${currentPrefix}${connector}${itemName}\n`;
      }

      lineCount++;

      // If it's a non-filtered directory, recursively render its contents
      if (isDirectory && !truncated && !isFiltered) {
        const childPrefix = currentPrefix + (isLastItem ? "    " : "│   ");
        result += render(itemNode, childPrefix, itemPath);
      }
    }

    return result;
  }

  return render(tree);
}
