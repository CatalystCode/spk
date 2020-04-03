import { Command } from "../command";

const subfolders = [
  "create-variable-group",
  "init",
  "pipeline",
  "get-display-name",
];

export const commandDecorator = Command(
  "project",
  "Initialize and manage your Bedrock project.",
  subfolders.map((m) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cmd = require(`./${m}`);
    return cmd.commandDecorator;
  })
);
