import commander from "commander";
import fs from "fs";
import shell from "shelljs";
import { logger } from "../../logger";

/**
 * Adds the init command to the commander command object
 *
 * @param command Commander command object to decorate
 */
export const versionCommandDecorator = (command: commander.Command): void => {
  command
    .command("version")
    .alias("v")
    .description(
      "Initialize will verify that all infrastructure deployment prerequisites have been correctly installed."
    )
    .action(async opts => {
      const { silent = false, output } = opts;
      shell.exec(
        "terraform version",
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
