#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { compile, run } from ".";

function main() {
  if (process.argv.length !== 4) {
    console.log("Usage: hyke command filename");
    return;
  }

  const command = process.argv[2];
  const fileName = process.argv[3];

  const source = readFileSync(fileName, {
    encoding: "utf-8",
  });

  switch (command) {
    case "r":
    case "run":
      console.log(run(source));
      break;
    case "c":
    case "compile":
      const out = compile(source, (error: Error) => console.log(error.message));
      writeFileSync("out.ts", out, { encoding: "utf-8" });
      break;
    default:
      console.log(`Unknown command: ${command}`);
  }
}

if (require.main === module) {
  main();
}
