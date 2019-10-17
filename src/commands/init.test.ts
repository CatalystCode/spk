import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import { Config, defaultFileLocation, loadConfiguration } from "../config";
import { disableVerboseLogging, enableVerboseLogging, logger } from "../logger";
import { writeConfigToDefaultLocation } from "./init";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

const mockFileName = "src/commands/mocks/spk-config.yaml";
describe("Initializing a project to use spk with a config file", () => {
  test("init command basic file test", async () => {
    process.env.test_name = "my_storage_account";
    process.env.test_key = "my_storage_key";
    const filename = path.resolve(mockFileName);
    loadConfiguration(filename);
    expect(Config().introspection!).toBeDefined();
    expect(Config().introspection!.azure!.account_name).toBe(
      process.env.test_name
    );
    expect(Config().introspection!.azure!.key).toBe(process.env.test_key);
    logger.info("Able to initialize a basic config file");
  });
});

describe("Initializing a project a config file but no env vars", () => {
  test("init command basic file without env vars", async () => {
    const filename = path.resolve(mockFileName);
    process.env.test_name = "";
    process.env.test_key = "";
    try {
      loadConfiguration(filename);
      // Make sure execution does not get here:
      expect(true).toBeFalsy();
    } catch (err) {
      expect(err).toBeDefined();
      logger.info(
        "Error is being thrown on undefined env vars being referenced"
      );
    }
  });
});

describe("Initializing a project with a non-existent file", () => {
  test("Non-existent file test", async () => {
    const filename = path.resolve("./spk-config-test.yaml");
    try {
      loadConfiguration(filename);
      // Make sure execution does not get here:
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.code).toBe("ENOENT");
      logger.info("Error is being thrown on trying to use a non-existent file");
    }
  });
});

describe("Writing to default config location", () => {
  test("Default config location exists", async () => {
    try {
      const filename = path.resolve(mockFileName);
      process.env.test_name = "testStorageName";
      process.env.test_key = "testStorageKey";
      loadConfiguration(filename);
      Config().azure_devops!.access_token = "unit_test_token";

      await writeConfigToDefaultLocation();
      loadConfiguration(defaultFileLocation());

      expect(Config().azure_devops!).toBeDefined();
      expect(Config().azure_devops!.access_token!).toBe("unit_test_token");
    } catch (e) {
      logger.error(e);
      // Make sure execution does not get here:
      expect(true).toBeFalsy();
    }
    logger.info("Able to write to default config location");
  });
});
