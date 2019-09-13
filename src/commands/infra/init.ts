import commander from "commander";
import fs from "fs";
import shell from "shelljs";
import { logger } from "../../logger";
//import hasbin from "hasbin";

/**
 * Adds the init command to the commander command object
 *
 * @param command Commander command object to decorate
 */

let binaries: string[] = ["terraform", "git", "az", "helm"];

export const initCommand = (command: commander.Command): void => {
  command
    .command("init")
    .alias("i")
    .description(
      "Initialize will verify that all infrastructure deployment prerequisites have been correctly installed."
    )
    .action(() => {
      // Verify the executable in PATH
      for (let i of binaries) {
        if (!shell.which(i)) {
          logger.error("'" + i + "'" + " not installed");
          shell.exit(1);
        } else {
          logger.info(i + " VERIFIED");
        }
      }
      logger.info("Validation complete.");
    })
    .action(opts => {
      // Validate authentication with Azure
      const { output } = opts;
      shell.exec(
        "az account show",
        { silent: true },
        (code, stdout, stderr) => {
          if (output) {
            fs.writeFileSync(output, stdout, { encoding: "utf8" });
          }
          if (stderr) {
            logger.error(stderr);
          } else {
            logger.info(stdout);
          }
        }
      );
    });
};
