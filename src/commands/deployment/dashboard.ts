import commander from "commander";
import open = require("open");
import { exec } from "../../lib/shell";
import { logger } from "../../logger";
import { config } from "../init";

/**
 * Adds the onboard command to the commander command object
 * @param command Commander command object to decorate
 */
export const dashboardCommandDecorator = (command: commander.Command): void => {
  command
    .command("dashboard")
    .alias("d")
    .description("Launch the service introspection dashboard")
    .action(async opts => {
      if (
        !config.introspection ||
        !config.azure_devops ||
        !config.azure_devops.org ||
        !config.azure_devops.project ||
        !config.introspection.azure ||
        !config.introspection.azure.key ||
        !config.introspection.azure.account_name ||
        !config.introspection.azure.table_name ||
        !config.introspection.azure.partition_key
      ) {
        logger.error(
          "You need to specify configuration for your introspection storage account and DevOps pipeline to run this dashboard. Please initialize the spk tool with the right configuration"
        );
      }
      try {
        logger.info("Launching dashboard");
        const dockerRepository = config.introspection!.dashboard!.container!;
        await exec("docker", ["pull", dockerRepository]);
        exec("docker", [
          "run",
          "--rm",
          "-e",
          "REACT_APP_PIPELINE_ORG=" + config.azure_devops!.org!,
          "-e",
          "REACT_APP_PIPELINE_PROJECT=" + config.azure_devops!.project!,
          "-e",
          "REACT_APP_STORAGE_ACCOUNT_NAME=" +
            config.introspection!.azure!.account_name!,
          "-e",
          "REACT_APP_STORAGE_PARTITION_KEY=" +
            config.introspection!.azure!.partition_key!,
          "-e",
          "REACT_APP_STORAGE_TABLE_NAME=" +
            config.introspection!.azure!.table_name!,
          "-e",
          "REACT_APP_STORAGE_ACCESS_KEY=" + config.introspection!.azure!.key!,
          "-p",
          "1010:80",
          dockerRepository
        ]);
        await open("http://localhost:1010/");
      } catch (err) {
        logger.error(`Error occurred while launching dashboard ${err}`);
      }
    });
};
