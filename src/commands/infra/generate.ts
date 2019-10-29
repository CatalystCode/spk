import commander from "commander";
import fs, { chmod } from "fs";
import fsextra, { readdir } from "fs-extra";
import path from "path";
import { logger } from "../../logger";

/**
 * Adds the init command to the commander command object
 *
 * @param command Commander command object to decorate
 */
export const generateCommandDecorator = (command: commander.Command): void => {
  command
    .command("generate")
    .alias("g")
    .description("Generate scaffold for terraform cluster deployment.")
    .action(async opts => {
      try {
        logger.info("All required options are configured for scaffolding.");
        logger.warn(
          "You must specify each of the variables 'name', 'source', 'version', 'template' in order to scaffold out a deployment."
        );
      } catch (err) {
        logger.error("Error occurred while generating scaffold");
        logger.error(err);
      }
    });
};
