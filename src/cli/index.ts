import { Command } from "commander";
import { bundleCommand } from "./commands/bundle.js";
import { configCommand } from "./commands/config.js";
import { renderSplash } from "./ui/splash.js";

export async function run(argv: string[]) {
  if (argv.length <= 2) {
    renderSplash();
    return;
  }

  const program = new Command();

  program
    .name("fullsend")
    .version("2.1.1")
    .description("Bundle your codebase for AI chat interfaces");

  configCommand(program);
  bundleCommand(program);

  await program.parseAsync(argv);
}
