#!/usr/bin/env node

import { runGenerator } from "./commands/generate";

console.log("\n🚀  Instant Backend Generator");
console.log("   Generate a full REST backend from a schema — in seconds.\n");

runGenerator();
