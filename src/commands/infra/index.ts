import { Command } from "../command";
import { createCommandDecorator } from "./create";
import { initCommand } from "./init";
import { scaffoldCommandDecorator } from "./scaffold";

export const infraCommand = Command(
  "infra",
  "Deploy and modify your Bedrock infrastructure.",
  [initCommand, createCommandDecorator, scaffoldCommandDecorator]
);
