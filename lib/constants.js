export const defaultPatterns = [
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
