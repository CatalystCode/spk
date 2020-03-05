import commander from "commander";
import {
  fileInfo as bedrockFileInfo,
  save as saveBedrockFile
} from "../../lib/bedrockYaml";
import { build as buildCmd, exit as exitCmd } from "../../lib/commandBuilder";
import { PROJECT_INIT_DEPENDENCY_ERROR_MESSAGE } from "../../lib/constants";
import { hasValue } from "../../lib/validator";
import { logger } from "../../logger";
import { IBedrockFileInfo, IBedrockFile } from "../../types";
import { Bedrock, Config, readYaml, write } from "../../config";
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
    logger.info(`project path: ${projectPath}`);

    checkDependencies(projectPath);

    // Load bedrock.yaml
    let bedrockFile: IBedrockFile | undefined;

    // Get bedrock.yaml
    bedrockFile = Bedrock(projectPath);

    setDefaultRing(bedrockFile, ringName, projectPath);
    // Check if ring is already default, if so, warn and exit.
    // Set ring as default in bedrock.yaml

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
 * Sets the default ring
 * @param bedrockFile The bedrock.yaml file
 * @param ringName The name of the ring
 */
export const setDefaultRing = (
  bedrockFile: IBedrockFile,
  ringName: string,
  path: string
): void => {
  const rings = Object.keys(bedrockFile.rings);
  if (!rings.includes(ringName)) {
    throw new Error("The ring '" + ringName + "' is not defined bedrock.yaml");
  }

  for (let [name, value] of Object.entries(bedrockFile.rings)) {
    if (value === null) {
      bedrockFile.rings[name] = { isDefault: false };
    }
    let ring = bedrockFile.rings[name];

    if (name === ringName) {
      ring.isDefault = true;
    } else {
      if (typeof ring.isDefault !== "undefined") {
        ring.isDefault = false;
      }
    }
  }

  saveBedrockFile(path, bedrockFile);
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
