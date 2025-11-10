export async function formatOutput(data) {
  const { files, fileTree } = data;

  // Format files section
  const filesFormatted = files
    .map((file) => {
      const language = getLanguageFromExtension(file.name);
      return `${file.relativePath}:\n\`\`\`${language}\n${file.content}\n\`\`\``;
    })
    .join("\n\n");

  // Build output
  let output = "";

  if (fileTree) {
    output += "## File Structure\n\n";
    output += "```\n";
    output += fileTree;
    output += "```\n\n";
  }

  output += "## Files\n\n";
  output += filesFormatted;

  return output;
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
