import { Command } from "../command";
import { initCommand } from "./init";
import { versionCommandDecorator } from "./version";

export const infraCommand = Command(
  "infra",
  "Deploy and modify your Bedrock infrastructure.",
  [initCommand, versionCommandDecorator]
