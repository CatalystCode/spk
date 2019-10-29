import { Command } from "../command";
import { scaffoldCommandDecorator } from "./scaffold";
import { validateCommandDecorator } from "./validate";
import { generateCommandDecorator } from "./generate";

export const infraCommand = Command(
  "infra",
  "Manage and modify your Bedrock infrastructure.",
  [scaffoldCommandDecorator, validateCommandDecorator, generateCommandDecorator]
);
