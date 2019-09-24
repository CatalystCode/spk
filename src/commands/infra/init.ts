import commander from "commander";
import fs from "fs";
import emoji from "node-emoji";
import shell from "shelljs";
import { exec } from "../../lib/shell";
import { logger } from "../../logger";

/**
 * Adds the init command to the commander command object
 *
 * @param command Commander command object to decorate
 */

let binaries: string[] = ["terraform", "git", "az", "helm"];
let isDone: boolean = false;

export const initCommand = (command: commander.Command): void => {
  command
    .command("init")
    .alias("i")
    .description(
      "Initialize will verify that all infrastructure deployment prerequisites have been correctly installed."
    )
    .action(opts => {
      validatePrereqs();
      validateAzure2();
      validateEnvVariables();
    });
};

const validatePrereqs = () => {
  // Verify the executable in PATH
  logger.info(
    emoji.emojify(
      ":sparkles: VERIFYING INSTALLATION OF PREREQUISITES :sparkles:"
    )
  );
  for (let i of binaries) {
    if (!shell.which(i)) {
      logger.error(
        emoji.emojify(":no_entry_sign: '" + i + "'" + " not installed")
      );
      shell.exit(1);
    } else {
      logger.info(emoji.emojify(":white_check_mark: " + i));
    }
  }
  logger.info(emoji.emojify("Verification complete :white_check_mark:"));
};

const validateAzure = () => {
  // Validate authentication with Azure
  logger.info(
    emoji.emojify(":sparkles: VALIDATING AUTHENTICATION WITH AZURE :sparkles:")
  );
  shell.exec(
    "az account show -o none",
    { silent: true },
    (code, stdout, stderr) => {
      if (stderr) {
        logger.error(emoji.emojify(":no_entry_sign: " + stderr));
        shell.exit(1);
      } else {
        logger.info(
          emoji.emojify(":white_check_mark: Azure account logged in.")
        );
        logger.info(emoji.emojify("Verification complete :white_check_mark:"));
        isDone = true;
      }
    }
  );
};

const validateAzure2 = async () => {
  try {
    const azureAuth = await exec("az account show -o none");
    return azureAuth;
  } catch (_) {
    logger.warn(`Unable to authenticate with Azure. Please run 'az login'.`);
    return "";
  }
};
const validateEnvVariables = () => {
  // Check for environment variables
  logger.info(
    emoji.emojify(":sparkles: CHECKING ENVIRONMENT VARIABLES :sparkles:")
  );
  //process.env.PATH
  //console.log(process.env.PATH);
};
