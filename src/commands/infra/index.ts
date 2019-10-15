import { Command } from "../command";
import { createCommandDecorator } from "./create";
import { generateCommandDecorator } from "./generate";
import { scaffoldCommandDecorator } from "./scaffold";
import { validateCommandDecorator } from "./vaildate";

export const infraCommand = Command(
  "infra",
  "Manage and modify your Bedrock infrastructure.",
  [
    createCommandDecorator,
    generateCommandDecorator,
    scaffoldCommandDecorator,
    validateCommandDecorator
  ]
);
