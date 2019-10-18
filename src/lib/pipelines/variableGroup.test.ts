////////////////////////////////////////////////////////////////////////////////
// Mocks
////////////////////////////////////////////////////////////////////////////////
jest.mock("azure-devops-node-api");
jest.mock("../../config");
jest.mock("../azdoClient");

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////
import { VariableGroup } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import uuid from "uuid/v4";
import { Config } from "../../config";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import {
  addVariableGroup,
  addVariableGroupWithKeyVaultMap,
  TaskApi
} from "./variableGroup";

////////////////////////////////////////////////////////////////////////////////
// Tests
////////////////////////////////////////////////////////////////////////////////
beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("TaskApi", () => {
  test("should fail when PAT not set", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {}
    });

    let invalidPatError: Error | undefined;
    try {
      await TaskApi();
    } catch (err) {
      invalidPatError = err;
    }
    expect(invalidPatError).toBeDefined();
  });

  test("should fail when DevOps org is invalid", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid()
      }
    });

    let invalidOrgError: Error | undefined;
    try {
      await TaskApi();
    } catch (err) {
      invalidOrgError = err;
    }
    expect(invalidOrgError).toBeDefined();
  });

  test("should pass if org url and PAT set", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid(),
        org: uuid()
      }
    });

    let api: ITaskAgentApi | undefined;
    try {
      api = await TaskApi();
    } catch (err) {
      logger.info(err);
    }
    expect(api).toBeUndefined();
  });
});

describe("addVariableGroup", () => {
  test("should fail when variable group config is not set", async () => {
    (Config as jest.Mock).mockReturnValue({
      vsts_data: {}
    });

    let invalidGroupError: Error | undefined;
    try {
      logger.info("calling add variable group");
      await addVariableGroup();
    } catch (err) {
      invalidGroupError = err;
    }
    expect(invalidGroupError).toBeDefined();
  });

  test("should pass when variable group config is set", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid(),
        org: uuid(),
        variable_group: {
          description: "myvg desc",
          name: "myvg",
          vsts_data: {
            var1: {
              isSecret: "false",
              value: "value1"
            }
          }
        }
      }
    });

    let group: VariableGroup | undefined;
    try {
      logger.info("calling add variable group with mock config");
      group = await addVariableGroup();
    } catch (err) {
      logger.error(err);
    }
    expect(group).toBeUndefined();
  });
});

describe("addVariableGroupWithKeyVaultMap", () => {
  test("should fail when variable group config is not set", async () => {
    (Config as jest.Mock).mockReturnValue({
      key_vault_data: {}
    });

    let invalidGroupError: Error | undefined;
    try {
      logger.info("calling add variable group with Key Vault link");
      await addVariableGroupWithKeyVaultMap();
    } catch (err) {
      invalidGroupError = err;
    }
    expect(invalidGroupError).toBeDefined();
  });

  test("should fail when key vault data is not set under variable group", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid(),
        org: uuid(),
        variable_group: {
          description: "myvg desc",
          key_vault_data: {},
          name: "myvg"
        }
      }
    });

    let group: VariableGroup | undefined;
    try {
      logger.info("calling addVariableGroupWithKeyVaultMap with mock config");
      group = await addVariableGroupWithKeyVaultMap();
    } catch (err) {
      logger.error(err);
    }
    expect(group).toBeUndefined();
  });

  test("should fail when key vault name is not set under variable group", async () => {
    (serviceEndpoint as jest.Mock).mockReturnValue({
      serviceEndpoint: "end point id"
    });

    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid(),
        org: uuid(),
        variable_group: {
          description: "myvg desc",
          key_vault_data: {
            secrets: ["secret1", "secret2"],
            service_endpoint: {}
          },
          name: "myvg"
        }
      }
    });

    let group: VariableGroup | undefined;
    try {
      logger.info("calling addVariableGroupWithKeyVaultMap with mock config");
      group = await addVariableGroupWithKeyVaultMap();
    } catch (err) {
      logger.error(err);
    }
    expect(group).toBeUndefined();
  });

  test("should fail when service endpoint config is not set under variable group", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid(),
        org: uuid(),
        variable_group: {
          description: "myvg desc",
          key_vault_data: {
            name: "mykv",
            secrets: ["secret1", "secret2"],
            service_endpoint: {}
          },
          name: "myvg"
        }
      }
    });

    let group: VariableGroup | undefined;
    try {
      logger.info("calling addVariableGroupWithKeyVaultMap with mock config");
      group = await addVariableGroupWithKeyVaultMap();
    } catch (err) {
      logger.error(err);
    }
    expect(group).toBeUndefined();
  });

  test("should pass when variable group config is set", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid(),
        org: uuid(),
        variable_group: {
          description: "myvg desc",
          key_vault_data: {
            name: "mykv",
            secrets: ["secret1", "secret2"],
            service_endpoint: {
              name: "epname",
              service_principal_id: "pricid",
              service_principal_secret: "princsecret",
              subscription_id: "subid",
              subscription_name: "subname",
              tenant_id: "tenid"
            }
          },
          name: "myvg"
        }
      }
    });

    let group: VariableGroup | undefined;
    try {
      logger.info("calling add variable group with mock config");
      group = await addVariableGroupWithKeyVaultMap();
    } catch (err) {
      logger.error(err);
    }
    expect(group).toBeUndefined();
  });
});
