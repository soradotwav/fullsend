import { readFile, writeFile } from "node:fs/promises";
import type { FullsendConfig, UserConfig } from "../types.js";
import os from "node:os";
import path from "node:path";

/** Debug flag controlled by NODE_ENV or manual override */
export const DEBUG: boolean = process.env.NODE_ENV === "development";

/** Standard configuration filename */
const DEFAULT_CONFIG_NAME: string = ".fullsendrc";

/**
 * List of standard patterns to ignore.
 * Includes VCS, dependencies, build artifacts, logs, and binary files.
 */
export const DEFAULT_IGNORE_PATTERNS: readonly string[] = [
  // Version control
  ".git",
  ".svn",
  ".hg",

  // Dependencies
  "node_modules",
  "vendor",
  "bower_components",

  // Build outputs
  "dist",
  "build",
  "out",
  "bin",
  "obj",
  "target",
  "coverage",

  // Caches
  ".cache",
  ".parcel-cache",
  ".next",
  ".nuxt",
  ".turbo",
  "__pycache__",
  "*.pyc",

  // Logs and locks
  "*.log",
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Gemfile.lock",
  "poetry.lock",
  "composer.lock",

  // Environment and secrets
  ".env",
  ".env.*",

  // IDE and OS
  ".DS_Store",
  "Thumbs.db",
  ".idea",
  ".vscode",
  "*.swp",
  "*.swo",

  // Binaries and compiled
  "*.dll",
  "*.exe",
  "*.pdb",
  "*.so",
  "*.dylib",
  "*.class",
  "*.jar",
  "*.war",
  "*.o",
  "*.a",

  // Images (useless for AI)
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.ico",
  "*.svg",
  "*.webp",
  "*.bmp",

  // Fonts
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.eot",
  "*.otf",

  // Archives
  "*.zip",
  "*.tar",
  "*.gz",
  "*.rar",
  "*.7z",

  // Media
  "*.mp3",
  "*.mp4",
  "*.wav",
  "*.avi",
  "*.mov",
  "*.webm",

  // Documents (can't be parsed as text anyway)
  "*.pdf",
  "*.doc",
  "*.docx",
  "*.xls",
  "*.xlsx",

  // Databases
  "*.sqlite",
  "*.db",

  // Source maps and minified (waste of tokens)
  "*.map",
  "*.min.js",
  "*.min.css",

  // Misc config files that are noise
  ".gitignore",
  ".bundleignore",
  ".defaultignore",
];

/** Default configuration values applied when user config is missing or partial */
export const DEFAULT_USER_CONFIG: FullsendConfig = {
  useGitIgnore: true,
  verbose: false,
  format: "markdown",
  showFileTree: false,
  maxFileSize: 10 * 1024 * 1024,
};

/**
 * Type guard to validate if an unknown object matches the UserConfig interface.
 * Checks only properties that are present (since UserConfig is partial).
 *
 * @param obj - The object to validate
 * @returns True if the object is a valid UserConfig
 */
function isValidUserConfig(obj: unknown): obj is UserConfig {
  if (typeof obj !== "object" || obj === null) return false;

  const config = obj as Record<string, unknown>;

  if ("useGitIgnore" in config && typeof config.useGitIgnore !== "boolean")
    return false;

  if ("verbose" in config && typeof config.verbose !== "boolean") return false;

  if (
    "format" in config &&
    config.format !== "markdown" &&
    config.format !== "xml"
  )
    return false;

  if ("showFileTree" in config && typeof config.showFileTree !== "boolean")
    return false;

  if ("maxFileSize" in config && typeof config.maxFileSize !== "number")
    return false;

  if ("maxFileSize" in config && (config.maxFileSize as number) < 0)
    return false;

  return true;
}

/**
 * Merges two configurations.
 * Object properties are overwritten by the override config.
 *
 * @param base - The base configuration
 * @param override - The configuration to merge on top
 * @returns The merged configuration
 */
function mergeConfigs(base: UserConfig, override: UserConfig): UserConfig {
  return { ...base, ...override };
}

/**
 * Merges a partial user config with the default config to create a complete, valid configuration.
 * Applies defaults as the base, then merges the user config on top.
 *
 * @param config - The partial user configuration
 * @returns A complete FullsendConfig object with all defaults applied
 */
function resolveConfig(config: UserConfig): FullsendConfig {
  return mergeConfigs(DEFAULT_USER_CONFIG, config) as FullsendConfig;
}

/**
 * Loads and resolves the configuration by merging sources in priority order:
 * 1. Defaults
 * 2. Home directory config (~/.fullsendrc)
 * 3. Project directory config (./.fullsendrc)
 * 4. CLI overrides
 *
 * @param projectRoot - The root directory of the project being scanned
 * @param overrides - Optional overrides from CLI flags (highest priority)
 * @returns The final resolved configuration object
 */
export async function loadConfig(projectRoot: string, overrides: UserConfig) {
  let userConfig: UserConfig = {};

  // Load default config from ~/.fullsendrc
  try {
    const defaultConfigFile = await readFile(
      path.join(os.homedir(), DEFAULT_CONFIG_NAME),
      "utf8"
    );
    const parsedFile: unknown = JSON.parse(defaultConfigFile);

    if (isValidUserConfig(parsedFile)) {
      userConfig = mergeConfigs(userConfig, parsedFile);
    }
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      console.warn(
        "Invalid JSON in default config file. Skipping...\n Exception: ",
        error
      );
    } else if (DEBUG) {
      console.log(
        ".fullsendrc file doesnt exist in home directory. Skipping..."
      );
    }
  }

  // Load project config from ./fullsendrc
  try {
    const projectConfigFile = await readFile(
      path.join(projectRoot, DEFAULT_CONFIG_NAME),
      "utf8"
    );
    const parsedFile: unknown = JSON.parse(projectConfigFile);

    if (isValidUserConfig(parsedFile)) {
      userConfig = mergeConfigs(userConfig, parsedFile);
    }
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      console.warn(
        "Invalid JSON in default config file. Skipping...\n Exception: ",
        error
      );
    } else if (DEBUG) {
      console.log(
        ".fullsendrc file doesnt exist in project directory. Skipping..."
      );
    }
  }

  // Load CLI overrides
  userConfig = mergeConfigs(userConfig, overrides);

  return resolveConfig(userConfig);
}

export async function saveConfigToDisk(config: UserConfig): Promise<boolean> {
  const configPath = path.join(os.homedir(), DEFAULT_CONFIG_NAME);
  const configString = JSON.stringify(config, null, 2);

  try {
    await writeFile(configPath, configString, "utf8");
    return true;
  } catch (error) {
    return false;
  }
}

export async function loadConfigFromDisk(): Promise<UserConfig | null> {
  const configPath = path.join(os.homedir(), DEFAULT_CONFIG_NAME);

  try {
    const configString = await readFile(configPath, "utf8");
    const parsedFile: unknown = JSON.parse(configString);

    if (isValidUserConfig(parsedFile)) {
      return resolveConfig(parsedFile);
    }
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      console.warn(
        "Invalid JSON in default config file. Skipping...\n Exception: ",
        error
      );
    } else if (DEBUG) {
      console.log(
        ".fullsendrc file doesnt exist in project directory. Skipping..."
      );
    }
  }

  return null;
}
