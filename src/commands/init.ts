import commander from "commander";
import {
  Config,
  loadConfiguration,
  writeConfigToDefaultLocation
} from "../config";
import { logger } from "../logger";
import {
  validateAzure,
  validateEnvVariables,
  validatePrereqs
} from "./infra/validate";

/**
 * Adds the init command to the commander command object
 * @param command Commander command object to decorate
 */
export const initCommandDecorator = (command: commander.Command): void => {
  command
    .command("init")
    .alias("i")
    .description("Initialize the spk tool for the first time.")
    .option("-f, --file <config-file-path>", "Path to the config file.")
    .action(async opts => {
      try {
        if (!opts.file) {
          logger.error(
            "You need to specify a file that stores configuration. "
          );
          return;
        }
        loadConfiguration(opts.file);

        await validatePrereqs(["terraform", "git", "az", "helm"], true);

        await validateAzure(true);

        await validateEnvVariables(
          [
            "ARM_SUBSCRIPTION_ID",
            "ARM_CLIENT_ID",
            "ARM_CLIENT_SECRET",
            "ARM_TENANT_ID"
          ],
          true
        );

        await writeConfigToDefaultLocation(opts.file);

        logger.info("Successfully initialized the spk tool!");
      } catch (err) {
        logger.error(`Error occurred while initializing`);
        logger.error(err);
      }
    });
};
