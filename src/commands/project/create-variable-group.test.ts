// Mocks
jest.mock("../../config");

// imports
import uuid from "uuid/v4";
import { IAzureDevOpsOpts } from "../../lib/git";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import {
  create,
  setVariableGroupInBedrockFile,
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
const hldRepoUrl = uuid();
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

  test("Should fail when variableGroupName  argument is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      undefined,
      registryName,
      hldRepoUrl,
      servicePrincipalId,
      servicePrincipalPassword,
      tenant,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when registryName argument is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      variableGroupName,
      undefined,
      hldRepoUrl,
      servicePrincipalId,
      servicePrincipalPassword,
      tenant,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when hldRepoUrl argument is not specified", async () => {
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

  test("Should fail when servicePrincipalId argument is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      variableGroupName,
      registryName,
      hldRepoUrl,
      undefined,
      servicePrincipalPassword,
      tenant,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when servicePrincipalPassword argument is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      variableGroupName,
      registryName,
      hldRepoUrl,
      servicePrincipalId,
      undefined,
      tenant,
      accessopts
    );
    logger.info(`length: ${errors.length}`);
    expect(errors.length).toBe(1);
  });

  test("Should fail when tenant argument is not specified", async () => {
    const errors: string[] = await validateRequiredArguments(
      variableGroupName,
      registryName,
      hldRepoUrl,
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
        hldRepoUrl,
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

describe("setVariableGroupInBedrockFile", () => {
  test("Should fail with empty variable group name", async () => {
    const projectPath = process.cwd();
    let invalidGroupNameError: Error | undefined;
    try {
      logger.info("calling create");
      await setVariableGroupInBedrockFile("", "");
    } catch (err) {
      invalidGroupNameError = err;
    }
    expect(invalidGroupNameError).toBeDefined();
  });
});
