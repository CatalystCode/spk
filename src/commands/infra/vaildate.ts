import child_process from "child_process";
import commander from "commander";
import emoji from "node-emoji";
import { promisify } from "util";
import { logger } from "../../logger";

const binaries: string[] = ["terraform", "git", "az", "helm"];
const envVar: string[] = [
  "ARM_SUBSCRIPTION_ID",
  "ARM_CLIENT_ID",
  "ARM_CLIENT_SECRET",
  "ARM_TENANT_ID"
];

/**
 * Adds the validate command to the commander command object
 *
 * @param command Commander command object to decorate
 */
export const infraValidateCommand = (command: commander.Command): void => {
  command
    .command("validate")
    .alias("v")
    .description(
      "Validate will verify that all infrastructure deployment prerequisites have been correctly installed."
    )
    .action(async opts => {
      try {
        if (await validatePrereqs(binaries, false)) {
          logger.info(
            emoji.emojify(
              "Installation of Prerequisites verified: :white_check_mark:"
            )
          );
          if (await validateAzure(false)) {
            logger.info(
              emoji.emojify("Azure account verified: :white_check_mark:")
            );
            if (await validateEnvVariables(envVar, false)) {
              logger.info(
                emoji.emojify(
                  "Environment variables verified: :white_check_mark:"
                )
              );
            }
          }
        }
      } catch (err) {
        logger.error(`Error validating init prerequisites`);
        logger.error(err);
      }
    });
};

/**
 * Validates that prerequisites are installed
 *
 * @param executables Array of exectuables to check for in PATH
 */
export const validatePrereqs = async (
  executables: string[],
  globalInit: boolean
): Promise<boolean> => {
  // Validate executables in PATH
  for (const i of executables) {
    try {
      await promisify(child_process.exec)("which " + i);
    } catch (err) {
      if (globalInit === true) {
        logger.warn(i + " not installed.");
      } else {
        logger.error(
          emoji.emojify(":no_entry_sign: '" + i + "'" + " not installed")
        );
      }
      return false;
    }
  }
  return true;
};

/**
 * Validates that user is logged into Azure CLI
 */
export const validateAzure = async (globalInit: boolean): Promise<boolean> => {
  // Validate authentication with Azure
  try {
    await promisify(child_process.exec)("az account show -o none");
  } catch (err) {
    if (globalInit === true) {
      logger.warn(
        "Unable to authenticate with Azure CLI. Please run 'az login'."
      );
    } else {
      logger.error(emoji.emojify(":no_entry_sign: " + err));
    }
    return false;
  }
  return true;
};

/**
 * Validates that environment variables are set and not null
 *
 * @param variables Array of environment vairables to check for
 */
export const validateEnvVariables = async (
  variables: string[],
  globalInit: boolean
): Promise<boolean> => {
  // Validate environment variables
  for (const i of variables) {
    if (!process.env[i] && !null) {
      if (globalInit === true) {
        logger.warn(i + " not set as an environment variable");
      } else {
        logger.error(
          emoji.emojify(
            ":no_entry_sign: " + i + " not set as an environment variable."
          )
        );
      }
      return false;
    }
  }
  return true;
};
