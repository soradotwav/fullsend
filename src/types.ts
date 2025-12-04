export interface FullsendConfig {
  ignorePatterns: string[];
  useGitIgnore: boolean;
  verbose: boolean;
  format: "markdown" | "xml";
  showFileTree: boolean;
}

export type UserConfig = Partial<FullsendConfig>;

export interface FullsendFile {
  path: string;
  relativePath: string;
  size: number;
}

export interface FullsendLoadedFile extends FullsendFile {
  content: string;
}

export interface FullsendResultMetadata {
  totalTokens: number;
  filesSkipped: number;
  duration: number;
}

export interface FullsendResult {
  files: FullsendFile[];
  output: string;
  metadata: FullsendResultMetadata;
}
