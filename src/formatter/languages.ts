/**
 * Map of file extensions to language names
 */
const languages: Record<string, string> = {
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

/**
 * Returns the language name for a given file path based on its extension.
 * @param path The file path to get the language for.
 * @returns The language name, or an empty string if no language is found.
 *
 * @example
 * ```typescript
 * const language = getLanguageFromFile("test.ts");
 * console.log(language); // "typescript"
 * ```
 */
export function getLanguageFromFile(path: string): string {
  const dotIndex = path.lastIndexOf(".");

  if (dotIndex === -1 || dotIndex === path.length - 1) {
    return "";
  }

  return languages[path.slice(dotIndex + 1).toLowerCase()] ?? "";
}
