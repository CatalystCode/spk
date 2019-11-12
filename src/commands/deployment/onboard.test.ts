// imports
import * as path from "path";
import uuid from "uuid/v4";
import {
  Config,
  loadConfiguration,
  writeConfigToDefaultLocation,
  readYaml,
  saveConfig,
  defaultFileLocation
} from "../../config";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import { IAzureAccessOpts, IConfigYaml } from "../../types";
import { setConfiguration, validateRequiredArguments } from "./onboard";
import fs from "fs";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

const mockFileName = "src/commands/mocks/spk-config.yaml";
const storageAccountName = uuid();
const storageTableName = uuid();
const storageResourceGroup = uuid();
const accessOpts: IAzureAccessOpts = {
  servicePrincipalId: uuid(),
  servicePrincipalPassword: uuid(),
  subscriptionId: uuid(),
  tenantId: uuid()
};

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
  test("Should pass when storage account and table names are specified", async () => {
    const filename = path.resolve(mockFileName);
    process.env.test_name = "testStorageName";
    process.env.test_key = "testStorageKey";

    // create config file in default location
    await writeConfigToDefaultLocation(filename);

    // set storage and table names
    await setConfiguration(storageAccountName, storageTableName);

    // reloead configuration
    loadConfiguration(defaultFileLocation());

    const { azure } = Config().introspection!;
    expect(azure!.account_name).toBe(storageAccountName);
    expect(azure!.table_name).toBe(storageTableName);
  });
});
