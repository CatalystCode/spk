import commander from "commander";
import dotenv = require("dotenv");
import * as fs from "fs";
import yaml from "js-yaml";
import * as os from "os";
import { logger } from "../logger";
import { Command } from "./command";

const defaultFileLocation = os.homedir() + "/.spk-config.yml";
export let config: { [id: string]: any } = {};

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
        loadConfiguration(opts.file);
        await writeConfigToFile(opts.file);
      } catch (err) {
        logger.error(`Error occurred while initializing`);
        logger.error(err);
      }
    });
};

/**
 * Loads configuration from a given filename, if provided, otherwise
 * uses the default file location ~/.spk-config.yml
 * @param fileName file to load configuration from
 */
export const loadConfiguration = (fileName?: string) => {
  if (!fileName) {
    fileName = defaultFileLocation;
  }
  try {
    fs.statSync(fileName);
    dotenv.config();
    const data = readYamlFile(fileName!);
    loadConfigurationFromLocalEnv(data);
  } catch (err) {
    logger.error(`File ${fileName} does not exist.`);
  }
};

/**
 * Loads configuration from local env
 * @param configYaml configuration in object form
 */
export const loadConfigurationFromLocalEnv = (configObj: any) => {
  const iterate = (obj: any) => {
    if (obj != null && obj !== undefined) {
      Object.keys(obj).forEach(key => {
        // logger.info(`key: ${key}, value: ${obj[key]}`)
        const regexp = /\${env:([a-zA-Z_$][a-zA-Z_$0-9]+)}/g;
        const match = regexp.exec(obj[key]);
        if (match && match.length >= 2) {
          // logger.info(match);
          obj[key] = process.env[match[1]];
          logger.info(`Setting key ${key} to ${obj[key]}`);
        }
        if (typeof obj[key] === "object") {
          iterate(obj[key]);
        }
      });
    }
  };

  iterate(configObj);
  // Set the global config so env vars are loaded into it
  config = configObj;
  logger.info(config.deployment.storage.table_name);
  logger.info(config.deployment.storage.account_name);
  logger.info(config.deployment.storage.key);
  logger.info(config.deployment.storage.partition_key);
};

/**
 * Reads a YAML file and loads it into an object
 * @param fileLocation path to the config file to read
 */
const readYamlFile = (fileLocation: string): string => {
  const data: string = fs.readFileSync(fileLocation, "utf-8");
  const response = yaml.load(data);
  const json = response;
  return json;
};

/**
 * Writes configuration to a file
 */
export const writeConfigToFile = async (fileName?: string) => {
  if (fileName && fileName !== defaultFileLocation) {
    logger.info(`Saving config file`);
    fs.createReadStream(fileName).pipe(
      fs.createWriteStream(defaultFileLocation)
    );
  }
};
