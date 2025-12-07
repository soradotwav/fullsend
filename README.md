# fullsend

Send your entire codebase to AI chat interfaces in one go. Bypass file upload limits by combining all project files into a single, formatted output that's ready to paste into ChatGPT, Claude, or any other LLM.

## Why fullsend?

Most AI chat interfaces limit you to 10-20 file uploads. **fullsend** solves this by:

- **No file limits** - Include 100+ files in a single message
- **Preserves structure** - Shows your project's directory tree
- **Smart filtering** - Automatically excludes node_modules, build files, etc.
- **Git-aware** - Respects your `.gitignore` patterns automatically
- **Clean output** - Formatted markdown with syntax highlighting for each file
- **Zero config** - Works out of the box with sensible defaults

## Installation

### Global Install (Recommended)

```bash
npm install -g fullsend
```

### Use Without Installing

```bash
npx fullsend ./your-project
```

## Quick Start

```bash
# Send current directory to clipboard
fullsend .

# Send specific project
fullsend ./my-react-app

# Save to file instead
fullsend ./my-project -o context.md
```

The output is automatically copied to your clipboard, ready to paste into any AI chat.

## Usage

```bash
fullsend <directory> [options]
```

### Options

| Option                | Description                                 |
| --------------------- | ------------------------------------------- |
| `-o, --output <file>` | Save to file instead of clipboard           |
| `-x, --xml`           | Output in XML format (optimized for Claude) |
| `--tree`              | Include file tree in output                 |
| `--no-gitignore`      | Don't use .gitignore patterns               |
| `--dry-run`           | Preview files without generating output     |
| `--verbose`           | Show detailed information                   |
| `-h, --help`          | Display help information                    |
| `-V, --version`       | Display version number                      |

## Examples

### Basic Usage

```bash
# Bundle current directory
fullsend .

# Bundle specific project
fullsend ./my-app

# Preview what will be included
fullsend ./my-app --dry-run
```

### Output Options

```bash
# Save to file
fullsend ./my-project -o context.md

# Exclude file tree
fullsend ./my-project --no-tree

# Don't use .gitignore
fullsend ./my-project --no-gitignore
```

### Claude-Optimized Output

```bash
# XML format works best with Claude
fullsend ./my-project -x

# Combine with file output
fullsend ./my-project -x -o context.xml
```

### Real-World Examples

```bash
# Send React app for code review
fullsend ./my-react-app

# Send API server for debugging help
fullsend ./api-server -o debug-context.md

# Send specific feature directory
fullsend ./src/features/auth
```

## Output Format

fullsend generates clean markdown output:

```markdown
## File Structure

src/
├── components/
│ ├── Header.jsx
│ └── Footer.jsx
├── utils/
│ └── api.js
└── index.js
package.json

## Files

src/components/Header.jsx:
export const Header = () => {
return <header>My App</header>;
};

src/components/Footer.jsx:
export const Footer = () => {
return <footer>© 2024</footer>;
};
```

## Ignore Patterns

fullsend automatically ignores common files and directories:

### Default Ignore Patterns

- `node_modules/`
- `.git/`
- `dist/`, `build/`
- `.env` files
- `*.log` files
- Lock files (`package-lock.json`, `yarn.lock`, etc.)
- Large files (>10MB)
- Binary files

### Using .gitignore

fullsend automatically reads and applies your `.gitignore` patterns. No extra configuration needed.

### Custom Ignore File

Create a `.bundleignore` file in your project root for additional patterns:

```bash
# .bundleignore

# Exclude test files
*.test.js
*.spec.js
__tests__/
__mocks__/

# Exclude documentation
docs/
*.md

# Exclude config files
.eslintrc
.prettierrc
tsconfig.json

# Include files even if gitignore excludes them
!.env.example
!config/default.json
```

The ignore priority is:

1. Default patterns (always applied)
2. `.gitignore` patterns (if exists)
3. `.bundleignore` patterns (if exists, can override gitignore)

## Token Estimation

fullsend estimates token count for various AI models:

```bash
fullsend ./my-project
```

Output includes:

```
Output size: 45.2 KB
Tokens (GPT-4/Claude): 11,234
```

Typical token counts:

- Small project (10-20 files): ~5,000-15,000 tokens
- Medium project (50-100 files): ~20,000-50,000 tokens
- Large project (200+ files): ~80,000+ tokens

**Tip:** Most modern AI models support 100K-200K token context windows, so even large projects fit easily.

## Use Cases

### Code Review

```bash
fullsend ./my-app
# Paste into Claude/ChatGPT with: "Please review this codebase for bugs and improvements"
```

### Architecture Help

```bash
fullsend ./legacy-project
# Ask: "Help me refactor this to modern React patterns"
```

### Debugging

```bash
fullsend ./api-server -o bug-context.md
# Share with: "Here's my full codebase. The authentication isn't working..."
```

### Documentation

```bash
fullsend ./src -o docs-context.md
# Request: "Generate comprehensive documentation for this codebase"
```

### Learning

```bash
fullsend ./open-source-project
# Ask: "Explain how this project is structured and how it works"
```

## Tips & Best Practices

### 1. Use .bundleignore for Large Projects

Exclude non-essential files to reduce token usage:

```bash
# .bundleignore
*.test.js
*.stories.js
docs/
examples/
```

### 2. Preview Before Sending

```bash
fullsend ./my-project --dry-run
```

### 3. Focus on Specific Directories

Instead of sending the entire project, focus on relevant parts:

```bash
fullsend ./src/features/authentication
```

### 4. Save Context for Reuse

```bash
fullsend ./my-app -o context.md
# Now you can share context.md or paste it later
```

### 5. Combine with Specific Questions

When pasting into AI chat, add context:

```
Here's my full React application. I'm having issues with state management
in the user authentication flow. Can you help identify the problem?

[paste fullsend output]
```

## Supported Languages

fullsend automatically detects and applies syntax highlighting for:

**Web:** JavaScript, TypeScript, HTML, CSS, SCSS, Vue, Svelte, Astro  
**Backend:** Python, Ruby, Go, Java, PHP, C#, Rust  
**Mobile:** Swift, Kotlin  
**Data:** SQL, JSON, YAML, TOML, XML, GraphQL  
**Systems:** C, C++, Bash, Dockerfile, Makefile  
**Functional:** Elixir, Erlang, Haskell, OCaml, F#, Clojure, Scala  
**Scientific:** R, MATLAB, Julia  
**Other:** Lua, Perl, Nim, Zig, Solidity

## Requirements

- **Node.js** >= 18.0.0
- **Platforms:** macOS, Linux, Windows

## Troubleshooting

### Clipboard not working on Linux

Install xclip or xsel:

```bash
sudo apt-get install xclip  # Ubuntu/Debian
sudo yum install xclip      # Fedora/RHEL
```

### "Module not found" errors

Reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Files not being included

Check what's being ignored:

```bash
fullsend ./my-project --dry-run --verbose
```

### Output too large

Use `.bundleignore` to exclude unnecessary files:

```bash
echo "*.test.js\ndocs/\nexamples/" > .bundleignore
fullsend ./my-project
```

## How It Works

1. **Scans** the target directory recursively
2. **Filters** using .gitignore, .bundleignore, and default patterns
3. **Reads** all text files (skips binaries)
4. **Generates** a directory tree structure
5. **Formats** each file with syntax highlighting
6. **Outputs** to clipboard or file

## Links

- **npm:** https://www.npmjs.com/package/fullsend
- **GitHub:** https://github.com/soradotwav/fullsend
- **Issues:** https://github.com/soradotwav/fullsend/issues

## Support

If fullsend helps you, please:

- ⭐ Star the repo on GitHub
- 📦 Share with other developers
- 🐛 Report bugs and suggest features
