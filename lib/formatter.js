export async function formatOutput(data, options = {}) {
  const { files, fileTree } = data;
  const { xml } = options;

  if (xml) {
    return formatXML(files, fileTree);
  }

  return formatMarkdown(files, fileTree);
}

/**
 * Escape special characters in XML attribute values.
 * Handles quotes, ampersands, and angle brackets.
 */
function escapeXMLAttribute(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escapes the CDATA end sequence "]]>" by splitting it into two CDATA blocks.
 * Standard XML workaround: "]]>" becomes "]]]]><![CDATA[>"
 */
function escapeCDATA(str) {
  return str.replace(/]]>/g, "]]]]><![CDATA[>");
}

/**
 * Format output as XML with CDATA-wrapped content.
 * CDATA prevents XML injection from file contents containing </file> or similar.
 */
function formatXML(files, fileTree) {
  let output = "<codebase>\n";

  if (fileTree) {
    output += "<structure>";
    output += escapeCDATA(fileTree);
    output += "</structure>\n";
  }

  files.forEach((file) => {
    const safePath = escapeXMLAttribute(file.relativePath);
    const safeContent = escapeCDATA(file.content);
    output += `<file path="${safePath}"><![CDATA[${safeContent}]]></file>\n`;
  });

  output += "</codebase>";
  return output;
}

/**
 * Format output as Markdown with fenced code blocks.
 */
function formatMarkdown(files, fileTree) {
  let output = "";

  if (fileTree) {
    output += "## File Structure\n\n";
    output += "```\n";
    output += fileTree;
    output += "```\n\n";
  }

  output += "## Files\n\n";

  const filesFormatted = files
    .map((file) => {
      const language = getLanguageFromExtension(file.name);
      return `${file.relativePath}:\n\`\`\`${language}\n${file.content}\n\`\`\``;
    })
    .join("\n\n");

  output += filesFormatted;

  return output;
}

/**
 * Map file extensions to language identifiers for syntax highlighting.
 */
function getLanguageFromExtension(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const languageMap = {
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    rs: "rust",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    json: "json",
    xml: "xml",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    sql: "sql",
    md: "markdown",
    mdx: "markdown",
    vue: "vue",
    svelte: "svelte",
    astro: "astro",
    dockerfile: "dockerfile",
    makefile: "makefile",
    cmake: "cmake",
    gradle: "gradle",
    r: "r",
    R: "r",
    m: "matlab",
    jl: "julia",
    lua: "lua",
    pl: "perl",
    scala: "scala",
    clj: "clojure",
    ex: "elixir",
    exs: "elixir",
    erl: "erlang",
    hrl: "erlang",
    nim: "nim",
    nix: "nix",
    ml: "ocaml",
    fs: "fsharp",
    fsx: "fsharp",
    graphql: "graphql",
    gql: "graphql",
    proto: "protobuf",
    sol: "solidity",
    zig: "zig",
  };

  return languageMap[ext] || "";
}
