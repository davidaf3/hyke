#!/usr/bin/env node

import compile from "./src/compiler";
import run from "./src/runner";

function main() {
  if (process.argv.length !== 4) {
    console.log("Usage: hyke command filename");
    return;
  }

  const command = process.argv[2];
  const fileName = process.argv[3];

  switch (command) {
    case "r":
    case "run":
      run(fileName);
      break;
    case "c":
    case "compile":
      compile(fileName);
      break;
    default:
      console.log(`Unknown command: ${command}`);
  }
}

if (require.main === module) {
  main();
}
