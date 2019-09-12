import { Command } from "../command";
import { versionCommandDecorator } from "./version";

export const infraCommand = Command(
  "infra",
  "Deploy and modify your Bedrock project.",
  [versionCommandDecorator]
);
