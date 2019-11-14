// imports
import fs from "fs";
import yaml from "js-yaml";
import os from "os";
import * as path from "path";
import uuid from "uuid/v4";
import { Config, loadConfiguration } from "../../config";
import * as config from "../../config";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import { IAzureAccessOpts, IConfigYaml } from "../../types";
import { setConfiguration, validateRequiredArguments } from "./onboard";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

const storageAccountName = uuid();
const storageTableName = uuid();
const storageResourceGroup = uuid();
const accessOpts: IAzureAccessOpts = {
  servicePrincipalId: uuid(),
  servicePrincipalPassword: uuid(),
  subscriptionId: uuid(),
  tenantId: uuid()
};

const randomTmpDir = path.join(os.tmpdir(), uuid());
fs.mkdirSync(randomTmpDir);
const testConfigFile = path.join(randomTmpDir, "config.yaml");

jest.spyOn(config, "defaultConfigFile").mockImplementation((): string => {
  return testConfigFile;
});

describe("validateRequiredArguments", () => {
  test("Should fail when all required arguments specified with empty values", async () => {
    const opts: IAzureAccessOpts = {};

    const errors: string[] = await validateRequiredArguments("", "", "", opts);
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(7);
  });

  test("Should fail when all required arguments specified with undefined values", async () => {
    const opts: IAzureAccessOpts = {};

    const errors: string[] = await validateRequiredArguments(
      undefined,
      undefined,
      undefined,
      opts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(7);
  });

  test("Should fail when storageAccountName specified with undefined values", async () => {
    const errors: string[] = await validateRequiredArguments(
      undefined,
      storageTableName,
      storageResourceGroup,
      accessOpts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when storageTableName specified with undefined values", async () => {
    const errors: string[] = await validateRequiredArguments(
      storageAccountName,
      undefined,
      storageResourceGroup,
      accessOpts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when storageResourceGroup specified with undefined values", async () => {
    const errors: string[] = await validateRequiredArguments(
      storageAccountName,
      storageTableName,
      undefined,
      accessOpts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when servicePrincipalId specified with undefined values", async () => {
    const opts: IAzureAccessOpts = {
      servicePrincipalId: undefined,
      servicePrincipalPassword: uuid(),
      subscriptionId: uuid(),
      tenantId: uuid()
    };
    const errors: string[] = await validateRequiredArguments(
      storageAccountName,
      storageTableName,
      storageResourceGroup,
      opts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when servicePrincipalPassword specified with undefined values", async () => {
    const opts: IAzureAccessOpts = {
      servicePrincipalId: uuid(),
      servicePrincipalPassword: undefined,
      subscriptionId: uuid(),
      tenantId: uuid()
    };
    const errors: string[] = await validateRequiredArguments(
      storageAccountName,
      storageTableName,
      storageResourceGroup,
      opts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when subscriptionId specified with undefined values", async () => {
    const opts: IAzureAccessOpts = {
      servicePrincipalId: uuid(),
      servicePrincipalPassword: uuid(),
      subscriptionId: undefined,
      tenantId: uuid()
    };
    const errors: string[] = await validateRequiredArguments(
      storageAccountName,
      storageTableName,
      storageResourceGroup,
      opts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when tenantId specified with undefined values", async () => {
    const opts: IAzureAccessOpts = {
      servicePrincipalId: uuid(),
      servicePrincipalPassword: uuid(),
      subscriptionId: uuid(),
      tenantId: undefined
    };
    const errors: string[] = await validateRequiredArguments(
      storageAccountName,
      storageTableName,
      storageResourceGroup,
      opts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });
});

describe("setConfiguration", () => {
  test("Should pass updating previous storage account and table names", async () => {
    try {
      const data = {
        introspection: {
          azure: {
            account_name: "test-storage",
            table_name: "test-table"
          }
        }
      };

      // create config file in test location
      fs.writeFileSync(testConfigFile, yaml.safeDump(data));

      logger.info(`testConfigFile: ${testConfigFile}`);

      // set storage and table names
      await setConfiguration(storageAccountName, storageTableName);
      loadConfiguration(testConfigFile);

      const { azure } = Config().introspection!;
      expect(azure!.account_name).toBe(storageAccountName);
      expect(azure!.table_name).toBe(storageTableName);
    } catch (err) {
      logger.error(`dirs error: ${err}`);
    }
  });

  test("Should pass updating previous undefined storage account and table names", async () => {
    try {
      const data = {
        introspection: {
          azure: {
            account_name: undefined,
            table_name: undefined
          }
        }
      };

      // create config file in test location
      fs.writeFileSync(testConfigFile, yaml.safeDump(data));

      logger.info(`testConfigFile: ${testConfigFile}`);

      // set storage and table names
      await setConfiguration(storageAccountName, storageTableName);
      loadConfiguration(testConfigFile);

      const { azure } = Config().introspection!;
      expect(azure!.account_name).toBe(storageAccountName);
      expect(azure!.table_name).toBe(storageTableName);
    } catch (err) {
      logger.error(`dirs error: ${err}`);
    }
  });
});
