#!/usr/bin/env node

import { run } from "./cli/index.js";

run(process.argv).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
