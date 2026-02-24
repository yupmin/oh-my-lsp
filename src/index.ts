#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("oh-my-lsp")
  .description("A TypeScript CLI powered by commander.js")
  .version("0.1.0");

program
  .command("hello")
  .description("Print a greeting")
  .option("-n, --name <name>", "Name to greet", "world")
  .action((options: { name: string }) => {
    console.log(`Hello, ${options.name}!`);
  });

program.parse();
