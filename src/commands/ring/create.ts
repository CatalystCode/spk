import commander from "commander";
import {
  addNewRing,
  fileInfo as bedrockFileInfo,
  read as loadBedrockFile,
} from "../../lib/bedrockYaml";
import { build as buildCmd, exit as exitCmd } from "../../lib/commandBuilder";
import {
  BEDROCK_FILENAME,
  PROJECT_INIT_DEPENDENCY_ERROR_MESSAGE,
} from "../../lib/constants";
import { updateTriggerBranchesForServiceBuildAndUpdatePipeline } from "../../lib/fileutils";
import * as dns from "../../lib/net/dns";
import { hasValue } from "../../lib/validator";
import { logger } from "../../logger";
import { BedrockFile, BedrockFileInfo } from "../../types";
import decorator from "./create.decorator.json";
import { build as buildError, log as logError } from "../../lib/errorBuilder";
import { errorStatusCode } from "../../lib/errorStatusCode";

/**
 * Check for bedrock.yaml
 *
 * @param projectPath project path
 * @param ringName name of ring
 */
export const checkDependencies = (
  projectPath: string,
  ringName: string
): void => {
  const fileInfo: BedrockFileInfo = bedrockFileInfo(projectPath);
  if (fileInfo.exist === false) {
    throw buildError(errorStatusCode.VALIDATION_ERR, "ring-err-dependency");
  }

  // Check if ring already exists, if it does, warn and exit
  const bedrockFile: BedrockFile = loadBedrockFile(projectPath);
  if (ringName in bedrockFile.rings) {
    throw buildError(errorStatusCode.EXE_FLOW_ERR, {
      errorKey: "ring-err-exists",
      values: [ringName, BEDROCK_FILENAME],
    });
  }
};

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
): Promise<void> => {
  if (!hasValue(ringName)) {
    logError(buildError(errorStatusCode.VALIDATION_ERR, "ring-err-name"));
    await exitFn(1);
    return;
  }

  try {
    logger.info(`Project path: ${projectPath}`);

    dns.assertIsValid("<ring-name>", ringName);
    checkDependencies(projectPath, ringName);

    // Add ring to bedrock.yaml
    addNewRing(projectPath, ringName);
    // Add ring to all linked service build pipelines' branch triggers
    const bedrockFile: BedrockFile = loadBedrockFile(projectPath);

    const newRings = Object.entries(bedrockFile.rings).map(([ring]) => ring);
    logger.info(`Updated project rings: ${newRings}`);

    const servicePathDirectories = Object.entries(bedrockFile.services).map(
      ([serviceRelativeDir]) => serviceRelativeDir
    );

    servicePathDirectories.forEach((s) => {
      updateTriggerBranchesForServiceBuildAndUpdatePipeline(newRings, s);
    });

    logger.info(`Successfully created ring: ${ringName} for this project!`);
    await exitFn(0);
  } catch (err) {
    logError(
      buildError(
        errorStatusCode.CMD_EXE_ERR,
        {
          errorKey: "ring-err-create",
          values: [ringName],
        },
        err
      )
    );
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
