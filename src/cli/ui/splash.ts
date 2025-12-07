import { colors } from "./colors.js";

const LOGO = `
   _____ _____ __    __    _____ _____ _____ ____  
  |   __|  |  |  |  |  |  |   __|   __|   | |    \\ 
  |   __|  |  |  |__|  |__|__   |   __| | | |  |  |
  |__|  |_____|_____|_____|_____|_____|_|___|____/ 
`;

export function renderSplash() {
  const { dim, dimmer, accent, text } = colors;

  console.log(accent(LOGO));
  console.log(`  ${dim("Bundle your codebase for AI chats")}`);
  console.log(`  ${dimmer("v2.0.0")}`);
  console.log("");
  console.log(`  ${text("Usage:")}`);
  console.log(
    `    ${accent("fullsend")} ${dim("[directory]")}        Bundle a directory`
  );
  console.log(
    `    ${accent("fullsend")} ${dim(
      "config"
    )}             Edit default settings`
  );
  console.log("");
  console.log(`  ${text("Options:")}`);
  console.log(`    ${dim("-o, --output <file>")}      Output to file`);
  console.log(`    ${dim("-f, --format <type>")}      markdown or xml`);
  console.log(`    ${dim("-t, --show-tree")}          Include file tree`);
  console.log(`    ${dim("-d, --dry-run")}            Preview without output`);
  console.log(`    ${dim("--no-gitignore")}           Ignore .gitignore`);
  console.log(`    ${dim("-h, --help")}               Show help`);
  console.log("");
  console.log(`  ${text("Examples:")}`);
  console.log(`    ${dimmer("$")} fullsend .`);
  console.log(`    ${dimmer("$")} fullsend ./src -o context.md`);
  console.log(`    ${dimmer("$")} fullsend -t -f xml`);
  console.log("");
}
