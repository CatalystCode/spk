import commander from "commander";
import {
  fileInfo as bedrockFileInfo,
  read as loadBedrockFile,
  setDefaultRing
} from "../../lib/bedrockYaml";
import { build as buildCmd, exit as exitCmd } from "../../lib/commandBuilder";
import { PROJECT_INIT_DEPENDENCY_ERROR_MESSAGE } from "../../lib/constants";
import { hasValue } from "../../lib/validator";
import { logger } from "../../logger";
import { IBedrockFile, IBedrockFileInfo } from "../../types";
import decorator from "./set-default.decorator.json";

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
    checkDependencies(projectPath);

    // Load bedrock.yaml
    let bedrockFile: IBedrockFile | undefined;

    // Get bedrock.yaml
    bedrockFile = loadBedrockFile(projectPath);
    setDefaultRing(bedrockFile, ringName, projectPath);

    logger.info(`Successfully set default ring: ${ringName} for this project!`);
    await exitFn(0);
  } catch (err) {
    logger.error(`Error occurred while setting default ring: ${ringName}`);
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
