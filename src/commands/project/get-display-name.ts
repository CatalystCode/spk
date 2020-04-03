/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/camelcase */
import commander, { CommandOptions } from "commander";
import * as fs from "fs";
import { read as readBedrockYaml } from "../../lib/bedrockYaml";
import { build as buildCmd, exit as exitCmd } from "../../lib/commandBuilder";
import { logger } from "../../logger";
import decorator from "./get-display-name.decorator.json";

/**
 * Executes the command, can all exit function with 0 or 1
 * when command completed successfully or failed respectively.
 *
 * @param opts validated option values
 * @param exitFn exit function
 */
export const execute = async (
  opts: CommandOptions,
  exitFn: (status: number) => Promise<void>
): Promise<void> => {
  let currentDirectory = process.cwd() + "/bedrock.yaml";
  try {
    // First, find a bedrock.yaml file in this directory and if not, iterate by
    // one directory up.
    while (!fs.existsSync(currentDirectory)) {
      const split = currentDirectory.split("/");
      if (split.length < 2) {
        break;
      }
      currentDirectory = currentDirectory.replace(
        split[split.length - 2] + "/",
        ""
      );
    }
    currentDirectory = currentDirectory.replace("/bedrock.yaml", "");
    const bedrockFile = readBedrockYaml(currentDirectory);
    const servicePath = process.cwd().replace(currentDirectory, ".");
    for (const serviceIndex in bedrockFile.services) {
      if (servicePath === bedrockFile.services[serviceIndex].path) {
        console.log(bedrockFile.services[serviceIndex].displayName);
        await exitFn(0);
      }
    }
    // Ideally, we should not be getting here, so throw an error.
    throw new Error("Display name for current directory could not be found.");
  } catch (err) {
    logger.error(err);
    await exitFn(1);
  }
};

/**
 * Adds the validate command to the commander command object
 * @param command Commander command object to decorate
 */
export const commandDecorator = (command: commander.Command): void => {
  buildCmd(command, decorator).action(async (opts: CommandOptions) => {
    await execute(opts, async (status: number) => {
      await exitCmd(logger, process.exit, status);
    });
  });
};
