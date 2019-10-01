import commander from "commander";
import dotenv = require("dotenv");
import * as fs from "fs";
import yaml from "js-yaml";
import * as os from "os";
import * as env from "../config";
import { logger } from "../logger";
import { Command } from "./command";

const defaultFileLocation = os.homedir() + "/.spk-config.yml";
/**
 * Adds the init command to the commander command object
 * @param command Commander command object to decorate
 */
export const initCommandDecorator = (command: commander.Command): void => {
  command
    .command("init")
    .alias("i")
    .description("Initialize the spk tool for the first time")
    .option(
      "-f, --file <config-file-path>",
      "Path to the config file",
      defaultFileLocation
    )
    .action(async opts => {
      try {
        fs.stat(opts.file, exists => {
          if (exists == null) {
            logger.info(`Initializing from config file ${opts.file}`);
            readYamlFile(opts.file).then((data: string) => {
              dotenv.config();
              initialize(data);
            });
          } else if (exists.code === "ENOENT") {
            logger.info(`File ${opts.file} does not exist.`);
          }
        });
      } catch (err) {
        logger.error(`Error occurred while initializing`);
        logger.error(err);
      }
    });
};

export const initialize = (config: any) => {
  logger.info(config);
  logger.info(config.infra.git_check);
  logger.info(env.introspectionStorageAccessKey);
  logger.info(env.introspectionStorageAccountName);
  logger.info(env.introspectionStoragePartitionKey);
  logger.info(env.introspectionStorageTableName);
};

/**
 * Reads a YAML file and loads it into an object
 * @param fileLocation path to the config file to read
 */
const readYamlFile = async (fileLocation: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    await fs.readFile(fileLocation, "utf8", (error, data) => {
      if (error) {
        logger.error(error);
        reject();
        throw error;
      }
      const response = yaml.load(data);
      const json = response;
      resolve(json);
      return json;
    });
  });
};

/**
 * `root` command
 */
export const initCommand = Command("init", "Initialize spk", [
  initCommandDecorator
]);
