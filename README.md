# fullsend

```
   _____ _____ __    __    _____ _____ _____ ____
  |   __|  |  |  |  |  |  |   __|   __|   | |    \
  |   __|  |  |  |__|  |__|__   |   __| | | |  |  |
  |__|  |_____|_____|_____|_____|_____|_|___|____/

  Bundle your codebase for AI chat interfaces
  v2.0.0
```

## About

Fullsend transforms your project into a single, formatted string optimized for LLMs. It bypasses file upload limits in ChatGPT, Claude, and other AI interfaces by copying your codebase directly to your clipboard in a format they understand.

## Installation

```
┌─ Package Managers ─────────────────────────────────────────────────────────┐
│                                                                            │
│  npm     npm install -g fullsend                                           │
│  pnpm    pnpm add -g fullsend                                              │
│  yarn    yarn global add fullsend                                          │
│  bun     bun install -g fullsend                                           │
│                                                                            │
│  npx     npx fullsend                    (no install)                      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
$ fullsend                       # Open splash screen / usage guide

$ fullsend .                     # Bundle current directory → clipboard
$ fullsend ./src                 # Bundle specific path → clipboard
$ fullsend . -o context.md       # Bundle to file
$ fullsend . -f xml              # Use XML format (Claude-optimized)
$ fullsend . -d                  # Dry run (preview files without output)

$ fullsend config                # Interactive configuration
```

## Command Reference

```
┌─ Synopsis ─────────────────────────────────────────────────────────────────┐
│                                                                            │
│  fullsend [directory] [options]                                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

```
┌─ Options ──────────────────────────────────────────────────────────────────┐
│                                                                            │
│  -o, --output <file>      Write output to file instead of clipboard        │
│  -f, --format <type>      Output format: markdown (default) or xml         │
│  -t, --show-tree          Include visual directory tree in final output    │
│  -d, --dry-run            Scan and validate files without generating output│
│  -m, --max-size <mb>      Maximum file size to process (default: 10MB)     │
│  -v, --verbose            Show detailed ignored/loaded file logs           │
│  --no-gitignore           Disable .gitignore pattern matching              │
│  -h, --help               Display help information                         │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Configuration

### Interactive Setup

Run `fullsend config` to set your global preferences.

```
$ fullsend config

◆  Output format
│  ● Markdown  ○ XML
│
◆  Include file tree in output?
│  ○ Yes  ● No
│
◆  Use .gitignore patterns?
│  ● Yes  ○ No
│
◆  Max file size (MB)
│  10
│
◆  Enable verbose logging?
│  ○ Yes  ● No
│
◇  Saved to ~/.fullsendrc
```

### Configuration Files

**~/.fullsendrc** - Global configuration (JSON)

Created by the config wizard. You can also place a `.fullsendrc` file in your project root to override global settings for that specific project.

```json
{
  "format": "markdown",
  "showFileTree": false,
  "useGitIgnore": true,
  "maxFileSize": 10485760,
  "verbose": false
}
```

**.fullsendignore** - Project-specific ignore patterns

Works exactly like `.gitignore`. Use this to exclude files from the AI bundle without removing them from version control.

```bash
# Exclude test files to save tokens
*.test.js
*.spec.ts
__tests__/

# Exclude documentation
docs/
*.md

# Force include a file usually ignored
!important.env.example
```

### Default Exclusions

Fullsend automatically ignores files that are useless for AI context to save tokens:

```
Dependencies        node_modules, vendor, bower_components
Version Control     .git, .svn, .hg
Build Artifacts     dist, build, out, target, coverage, bin, obj
Caches              .cache, .next, .nuxt, __pycache__
Lock Files          package-lock.json, yarn.lock, pnpm-lock.yaml
Environment         .env, .env.*
Binary Files        *.exe, *.dll, *.so, *.dylib, *.class, *.jar
Images/Media        *.jpg, *.png, *.gif, *.svg, *.mp4, *.pdf
Logs                *.log
Minified/Maps       *.min.js, *.map
```

## Output Formats

### Markdown (Default)

Optimized for ChatGPT, GitHub Copilot Chat, and general LLMs.

````markdown
## File Structure

src/
├── components/
│ └── Header.tsx
└── index.ts

## Files

src/components/Header.tsx:

```typescript
export const Header = () => <header>App</header>;
```
````

````

### XML

Optimized for Claude. Anthropic models allow for specific pre-fill cues with this format.

```xml
<codebase>
  <structure><![CDATA[
src/
├── components/
│   └── Header.tsx
└── index.ts
]]></structure>
  <file path="src/components/Header.tsx"><![CDATA[
export const Header = () => <header>App</header>
]]></file>
</codebase>
````

## Console Output

```
$ fullsend ./my-project

┌  fullsend
│
◇  127 files bundled
│  458 KB processed
│  12.3k tokens generated
│
└→ Clipboard
   0.43s
```

### Verbose Output

Use `-v` to debug what is being ignored.

```
$ fullsend . --verbose --dry-run

┌  Ignore Patterns
│  42 patterns loaded
│  node_modules, .git, dist, *.log, .env, ... +37 more
└

┌  File Tree
│
│  src/
│  ├── components/
│  │   ├── Button.tsx
│  │   └── Layout.tsx
│  └── index.ts
└

○  Dry Run Complete
   0.12s
```

## Requirements

- Node.js >= 20.11.0
- System Clipboard access (Linux users may need `xclip` or `xsel`)

## License

MIT License - Copyright (c) 2024 soradotwav
