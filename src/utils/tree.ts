import type { FullsendFile } from "../types.js";

interface TreeNode {
  [key: string]: TreeNode | null;
}

/**
 * Generates a tree from a list of files
 *
 * @param files The files to generate a tree from
 * @returns The generated tree
 */
export function generateTree(files: FullsendFile[]): string {
  const tree: TreeNode = {};

  // Build the tree
  for (const file of files) {
    const path = file.relativePath.split("/");
    let current = tree;

    // Check each part of the path
    for (let i = 0; i < path.length; i++) {
      const part = path[i];

      // Safety check; Should never happen but lets typescript know it can't be undefined
      if (!part) continue;

      // If we're at the last part, mark it as a file (=> null)
      if (i == path.length - 1) {
        current[part] = null;
      } else {
        // If the part doesn't exist, we create it
        if (!current[part]) {
          current[part] = {};
        }

        current = current[part]!;
      }
    }
  }

  /**
   * Recursively renders the tree
   *
   * @param currentNode The current node to render
   * @param currentPrefix The current prefix to use
   * @returns The rendered tree
   */
  function render(currentNode: TreeNode, currentPrefix: string = ""): string {
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
    entries.forEach(([itemName, itemNode], index) => {
      const isLastItem = index === entries.length - 1;
      const connector = isLastItem ? "└── " : "├── ";
      const suffix = itemNode !== null ? "/" : "";

      result += `${currentPrefix}${connector}${itemName}${suffix}\n`;

      // If the item is a directory, recursively render it
      if (itemNode !== null) {
        const childPrefix = currentPrefix + (isLastItem ? "    " : "│   ");
        result += render(itemNode, childPrefix);
      }
    });

    return result;
  }

  return render(tree);
}
