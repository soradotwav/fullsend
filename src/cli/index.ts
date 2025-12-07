import { Command } from "commander";
import { bundleCommand } from "./commands/bundle.js";

export function run(argv: string[]) {
  const program = new Command();

  program
    .name("fullsend")
    .version("2.0.0")
    .description("Bundle your codebase for AI chat interfaces");

  bundleCommand(program);

  program.parse(argv);
}
