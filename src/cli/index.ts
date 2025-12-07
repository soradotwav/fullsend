import { Command } from "commander";
import { bundleCommand } from "./commands/bundle.js";
import { renderSplash } from "./ui/splash.js";

export function run(argv: string[]) {
  if (argv.length <= 2) {
    renderSplash();
    return;
  }

  const program = new Command();

  program
    .name("fullsend")
    .version("2.0.0")
    .description("Bundle your codebase for AI chat interfaces");

  bundleCommand(program);

  program.parse(argv);
}
