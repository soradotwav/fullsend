import { setImmediate } from "timers/promises";

export async function formatOutput(data, options = {}) {
  const { files, fileTree } = data;
  const { xml } = options;

  const CHUNK_SIZE = 500;
  const parts = [];

  if (xml) {
    parts.push("<codebase>\n");
    if (fileTree) {
      parts.push("<structure><![CDATA[");
      parts.push(escapeCDATA(fileTree));
      parts.push("]]></structure>\n");
    }
  } else {
    if (fileTree) {
      parts.push("## File Structure\n\n");
      parts.push("```\n");
      parts.push(fileTree);
      parts.push("```\n\n");
    }
    parts.push("## Files\n\n");
  }

  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    await setImmediate();

    const chunkOutput = chunk
      .map((file) => {
        if (xml) {
          const safePath = escapeXMLAttribute(file.relativePath);
          const safeContent = escapeCDATA(file.content);
          return `<file path="${safePath}"><![CDATA[${safeContent}]]></file>\n`;
        } else {
          const language = getLanguageFromExtension(file.name);
          return `${file.relativePath}:\n\`\`\`${language}\n${file.content}\n\`\`\``;
        }
      })
      .join(xml ? "" : "\n\n");

    parts.push(chunkOutput);
  }

  if (xml) {
    parts.push("</codebase>");
  }

  return xml ? parts.join("") : parts.join("\n\n").replace(/\n\n\n\n/g, "\n\n");
}

function escapeXMLAttribute(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeCDATA(str) {
  return str.replace(/]]>/g, "]]]]><![CDATA[>");
}

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
