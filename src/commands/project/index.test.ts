// imports
import fs from "fs";
import yaml from "js-yaml";
import os from "os";
import path from "path";
import uuid from "uuid/v4";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import { IBedrockFile } from "../../types";
import { isBedrockFileExists } from "./index";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("isBedrockFileExists", () => {
  test("Should fail when empty file directory is passed", async () => {
    let invalidDirError: Error | undefined;

    try {
      logger.info("calling create");
      await isBedrockFileExists("");
    } catch (err) {
      invalidDirError = err;
    }
    expect(invalidDirError).toBeDefined();
  });

  test("Should return false when bedrock file does not exist", async () => {
    // Create random directory to initialize
    const randomTmpDir = path.join(os.tmpdir(), uuid());
    fs.mkdirSync(randomTmpDir);

    const exists = await isBedrockFileExists(randomTmpDir);

    logger.info(`bedrock.yaml file exists: ${exists}`);

    expect(exists).toBe(false);
  });

  test("Should return true when bedrock file exists", async () => {
    // Create random directory to initialize
    const randomTmpDir = path.join(os.tmpdir(), uuid());
    fs.mkdirSync(randomTmpDir);

    logger.info(`random temp dir: ${randomTmpDir}`);

    // create bedrock file to simulate the the use case that `spk project init` ran before
    const bedrockFileData: IBedrockFile = {
      rings: {},
      services: {},
      variableGroups: []
    };

    const asYaml = yaml.safeDump(bedrockFileData, {
      lineWidth: Number.MAX_SAFE_INTEGER
    });
    fs.writeFileSync(path.join(randomTmpDir, "bedrock.yaml"), asYaml);

    const exists = await isBedrockFileExists(randomTmpDir);
    logger.info(`bedrock.yaml file exists: ${exists} in ${randomTmpDir}`);

    expect(exists).toBe(true);
  });
});
