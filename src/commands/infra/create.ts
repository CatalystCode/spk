import commander from "commander";
import fs from "fs";
import shell from "shelljs";
import { logger } from "../../logger";

/**
 * Adds the init command to the commander command object
 *
 * @param command Commander command object to decorate
 */
export const createCommandDecorator = (command: commander.Command): void => {
  command
    .command("create")
    .alias("c")
    .description(
      "Create a bedrock template based on user args and deploy infrastructure template to a provided subscription."
    )
    .action(async opts => {
      const { silent = false, output } = opts;
      shell.exec(
        "terraform init",
        { silent: !!silent },
        (code, stdout, stderr) => {
          logger.info("Exit code:", code);
          logger.info(stdout);
          if (output) {
            fs.writeFileSync(output, stdout, { encoding: "utf8" });
          }
          if (stderr) {
            logger.error(stderr);
          }
        }
      );
    });
};
