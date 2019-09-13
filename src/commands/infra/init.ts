import commander from "commander";
import fs from "fs";
import shell from "shelljs";
import { logger } from "../../logger";
import emoji from "node-emoji";

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
      logger.info(
        emoji.emojify(":sparkles: VERIFYING INSTALLATION OF PREREQUISITES")
      );
      // Verify the executable in PATH
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
    })
    .action(opts => {
      // Validate authentication with Azure
      logger.info(
        emoji.emojify(":sparkles: VALIDATING AUTHENTICATION WITH AZURE")
      );
      const { output } = opts;
      shell.exec(
        "az account show",
        { silent: true },
        (code, stdout, stderr) => {
          if (output) {
            fs.writeFileSync(output, stdout, { encoding: "utf8" });
          }
          if (stderr) {
            logger.error(emoji.emojify(stderr));
          } else {
            logger.info("Azure CLI account:");
            logger.info(stdout);
            logger.info(
              emoji.emojify("Verification complete :white_check_mark:")
            );
          }
        }
      );
    });
};
