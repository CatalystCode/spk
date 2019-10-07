import commander from "commander";
import { logger } from "../../logger";
import { config } from "../init";
import { validate } from "@babel/types";

/**
 * Adds the validate command to the commander command object
 * @param command Commander command object to decorate
 */
export const validateCommandDecorator = (command: commander.Command): void => {
  command
    .command("validate")
    .alias("v")
    .description(
      "Validate deployment(s) for a service, release environment, build Id, commit Id, or image tag."
    )
    .action(() => {
      isValidConfig();
    });
};

/**
 * Validates that the deployment configuration is specified.
 */
export const isValidConfig = (): boolean => {
  var missingConfig = "";

  if (!config.deployment) {
    missingConfig = missingConfig + "deployment";
  } else {
    if (!config.deployment.storage) {
      missingConfig = missingConfig + "config.deployment.storage";
    } else {
      if (!config.deployment.storage.account_name) {
        missingConfig =
          missingConfig + "config.deployment.storage.account_name";
      }
      if (!config.deployment.storage.key) {
        missingConfig = missingConfig + "config.deployment.storage.key";
      }
      if (!config.deployment.storage.partition_key) {
        missingConfig =
          missingConfig + "config.deployment.storage.partition_key";
      }
      if (!config.deployment.storage.table_name) {
        missingConfig = missingConfig + "config.deployment.storage.table_name";
      }
    }
    if (!config.deployment.pipeline) {
      missingConfig = missingConfig + "config.deployment.pipeline ";
    } else {
      if (!config.deployment.pipeline.org) {
        missingConfig = missingConfig + "config.deployment.pipeline.org ";
      }
      if (!config.deployment.pipeline.project) {
        missingConfig = missingConfig + "config.deployment.pipeline.project";
      }
    }
  }

  if (missingConfig != "") {
    logger.error("Validation failed. Missing configuration: " + missingConfig);
    return false;
  }

  return true;
};
