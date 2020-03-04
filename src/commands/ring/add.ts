import commander from "commander";
import { fileInfo as bedrockFileInfo } from "../../lib/bedrockYaml";
import { build as buildCmd, exit as exitCmd } from "../../lib/commandBuilder";
import { PROJECT_INIT_DEPENDENCY_ERROR_MESSAGE } from "../../lib/constants";
import { hasValue } from "../../lib/validator";
import { logger } from "../../logger";
import { IBedrockFileInfo } from "../../types";

import decorator from "./add.decorator.json";

/**
 * Executes the command.
 *
 * @param ringName
 * @param projectPath
 */
export const execute = async (
  ringName: string,
  projectPath: string,
  exitFn: (status: number) => Promise<void>
) => {
  if (!hasValue(ringName)) {
    await exitFn(1);
    return;
  }

  try {
    logger.info(`project path: ${projectPath}`);

    checkDependencies(projectPath);

    // Check if ring already exists, if it does, warn and exit
    // Add ring to bedrock.yaml
    // Add ring to all linked service build pipelines' branch triggers

    logger.info(`Successfully added ring: ${ringName} to this project!`);
    await exitFn(0);
  } catch (err) {
    logger.error(`Error occurred while adding ring: ${ringName}`);
    logger.error(err);
    await exitFn(1);
  }
};

export const commandDecorator = (command: commander.Command): void => {
  buildCmd(command, decorator).action(async (ringName: string) => {
    await execute(ringName, process.cwd(), async (status: number) => {
      await exitCmd(logger, process.exit, status);
    });
  });
};

/**
 * Check for bedrock.yaml
 * @param projectPath
 */
export const checkDependencies = (projectPath: string) => {
  const fileInfo: IBedrockFileInfo = bedrockFileInfo(projectPath);
  if (fileInfo.exist === false) {
    throw new Error(PROJECT_INIT_DEPENDENCY_ERROR_MESSAGE);
  }
};
