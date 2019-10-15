import { config, loadConfiguration } from "./commands/init";
import { logger } from "./logger";
import { IConfigYaml } from "./types";

export const getConfig = (): IConfigYaml => {
  logger.debug(`Config in config.ts: ${JSON.stringify(config)}`);
  if (Object.keys(config).length === 0) {
    loadConfiguration();
    logger.debug(`After loading in config.ts: ${JSON.stringify(config)}`);
  }
  return config;
};
