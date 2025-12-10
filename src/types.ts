export interface FullsendConfig {
  useGitIgnore: boolean;
  verbose: boolean;
  format: "markdown" | "xml";
  showFileTree: boolean;
  maxFileSize: number;
  addOutputInstruction: boolean;
}

export type UserConfig = Partial<FullsendConfig>;

export interface FullsendFile {
  path: string;
  relativePath: string;
  size: number;
  isDirectory?: boolean;
  isFiltered?: boolean;
}

export interface FullsendLoadedFile extends FullsendFile {
  content: string;
}

export interface FullsendResultMetadata {
  totalTokens: number;
  filesSkipped: number;
  duration: number;
}

export interface LightweightFile {
  path: string;
  size: number;
  status: "skipped" | "failed" | "loaded";
}

export interface ScanResult {
  allFiles: FullsendFile[];
  includedFiles: FullsendFile[];
}

export interface FullsendResult {
  files: LightweightFile[];
  output: string;
  metadata: FullsendResultMetadata;
}
