// Mocks
jest.mock("../../config");

// imports
import uuid from "uuid/v4";
import { Config, loadConfiguration } from "../../config";
import { IAzureDevOpsOpts } from "../../lib/git";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import {
  create,
  setVariableGroupConfig,
  validateRequiredArguments
} from "./create-variable-group";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

const registryName = uuid();
const variableGroupName = uuid();
const hldRepoName = uuid();
const servicePrincipalId = uuid();
const servicePrincipalPassword = uuid();
const tenant = uuid();

const orgName = uuid();
const project = uuid();
const personalAccessToken = uuid();

const accessopts: IAzureDevOpsOpts = {
  orgName,
  personalAccessToken,
  project
};

describe("validateRequiredArguments", () => {
  test("Should fail when all required arguments specified with empty values", async () => {
    const opts: IAzureDevOpsOpts = {};

    const errors: string[] = await validateRequiredArguments(
      "",
      "",
      "",
      "",
      "",
      "",
      opts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(9);
  });

  test("Should fail when all required arguments are not specified", async () => {
    const opts: IAzureDevOpsOpts = {};
    const errors: string[] = await validateRequiredArguments(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      opts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(9);
  });

  test("Should fail when variableGroupName  arguments is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      undefined,
      registryName,
      hldRepoName,
      servicePrincipalId,
      servicePrincipalPassword,
      tenant,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when registryName arguments is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      variableGroupName,
      undefined,
      hldRepoName,
      servicePrincipalId,
      servicePrincipalPassword,
      tenant,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when hldRepoName arguments is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      variableGroupName,
      registryName,
      undefined,
      servicePrincipalId,
      servicePrincipalPassword,
      tenant,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when servicePrincipalId arguments is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      variableGroupName,
      registryName,
      hldRepoName,
      undefined,
      servicePrincipalPassword,
      tenant,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when servicePrincipalPassword arguments is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      variableGroupName,
      registryName,
      hldRepoName,
      servicePrincipalId,
      undefined,
      tenant,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when tenant arguments is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      variableGroupName,
      registryName,
      hldRepoName,
      servicePrincipalId,
      servicePrincipalPassword,
      undefined,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });
});

describe("create", () => {
  test("Should fail with empty variable group arguments", async () => {
    const accessOpts: IAzureDevOpsOpts = {
      orgName,
      personalAccessToken,
      project
    };

    let invalidDataError: Error | undefined;
    try {
      logger.info("calling create");
      await create("", "", "", "", "", "", accessOpts);
    } catch (err) {
      invalidDataError = err;
    }
    expect(invalidDataError).toBeDefined();
  });

  test("Should pass with empty variable group arguments", async () => {
    const accessOpts: IAzureDevOpsOpts = {
      orgName,
      personalAccessToken,
      project
    };

    let invalidGroupError: Error | undefined;
    try {
      logger.info("calling create");
      await create(
        variableGroupName,
        registryName,
        hldRepoName,
        servicePrincipalId,
        servicePrincipalPassword,
        tenant,
        accessOpts
      );
    } catch (err) {
      invalidGroupError = err;
    }
    expect(invalidGroupError).toBeDefined();
  });
});

describe("setVariableGroupConfig", () => {
  test("Should fail with empty variable group name", async () => {
    let invalidGroupNameError: Error | undefined;
    try {
      logger.info("calling create");
      await setVariableGroupConfig("");
    } catch (err) {
      invalidGroupNameError = err;
    }
    expect(invalidGroupNameError).toBeDefined();
  });

  test("Should pass with valid variable group name", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        variable_group: {}
      }
    });

    await setVariableGroupConfig(variableGroupName);

    // force reload by calling explict loadConfiguration method
    loadConfiguration();
    logger.info(
      `variable group name from config: ${
        Config().azure_devops!.variable_group
      }`
    );
    expect(Config().azure_devops!.variable_group).toBe(variableGroupName);
  });
});
