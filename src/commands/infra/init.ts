import child_process from "child_process";
import commander from "commander";
import fs from "fs";
import emoji from "node-emoji";
import shell from "shelljs";
import { promisify } from "util";
import { logger } from "../../logger";

/**
 * Adds the init command to the commander command object
 *
 * @param command Commander command object to decorate
 */

// Check for versions for each executable

let binaries: string[] = [
  "terraform",
  "git",
  "az",
  "helm"
];
let envVar: string[] = [
  "ARM_SUBSCRIPTION_ID",
  "ARM_CLIENT_ID",
  "ARM_CLIENT_SECRET",
  "ARM_TENANT_ID"
];

export const initCommand = (command: commander.Command): void => {
  command
    .command("init")
    .alias("i")
    .description(
      "Initialize will verify that all infrastructure deployment prerequisites have been correctly installed."
    )
    .action(async opts => {
      try {
        if (await validatePrereqs(binaries)) {
          if (await validateAzure()) {
            await validateEnvVariables(envVar)
          }
        };
      } catch (err) {
        logger.error(`Error validating init prerequisites`);
        logger.error(err);
      }
    });
};

export const validatePrereqs = async (
  executables: string[]
): Promise<boolean> => {
  // Validate executables in PATH
  for (let i of executables) {
    try {
      const foo = await promisify(child_process.exec)("which " + i);
    } catch (err) {
      logger.error(
        emoji.emojify(":no_entry_sign: '" + i + "'" + " not installed")
      );
      return false;
    }
  }
  logger.info(
    emoji.emojify("Installation of Prerequisites verified: :white_check_mark:")
  );
  return true;
};

export const validateAzure = async (): Promise<boolean> => {
  // Validate authentication with Azure
  try {
    await promisify(child_process.exec)("az account show -o none");
  } catch (err) {
    logger.error(emoji.emojify(":no_entry_sign: " + err));
    return false;
  }
  logger.info(emoji.emojify("Azure account verified: :white_check_mark:"));
  return true;
};

export const validateEnvVariables = async (
  variables: string[]
): Promise<boolean> => {
  // Validate environment variables
  for (let i of variables) {
    if (!process.env[i] && !null) {
      logger.error(
        emoji.emojify(
          ":no_entry_sign: " + i + " not set as environment variable."
        )
      );
      return false;
    }
  }
  logger.info(
    emoji.emojify("Environment variables verified: :white_check_mark:")
  );
  return true;
};
