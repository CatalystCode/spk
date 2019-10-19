// Mocks
jest.mock("azure-devops-node-api");
jest.mock("../../config");
jest.mock("../azdoClient");

// Imports
import {
  VariableGroup,
  VariableGroupParameters
} from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
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
  authorizeAccessToAllPipelines,
  buildKeyVaultVariablesMap,
  buildVariablesMap,
  doAddVariableGroup,
  IVariablesMap,
  TaskApi
} from "./variableGroup";

// Tests
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
      logger.info("calling add variable group with Key Vault map");
      await addVariableGroupWithKeyVaultMap();
    } catch (err) {
      invalidGroupError = err;
    }
    expect(invalidGroupError).toBeDefined();
  });

  test("should fail when key vault data is not set for variable group", async () => {
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

  test("should fail when key vault name is not set for variable group", async () => {
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
      group = await addVariableGroupWithKeyVaultMap();
    } catch (err) {
      logger.error(err);
    }
    expect(group).toBeUndefined();
  });

  test("should fail when service endpoint config is not set for variable group", async () => {
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

describe("doAddVariableGroup", () => {
  test("should pass when variable group with vsts data is set", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid(),
        org: uuid(),
        project: uuid(),
        variable_group: {
          description: uuid(),
          name: uuid(),
          vsts_data: {
            var1: {
              isSecret: false,
              value: "val1"
            },
            var2: {
              isSecret: true,
              value: "val2"
            }
          }
        }
      }
    });

    const groupConfig = Config().azure_devops!.variable_group!;
    const variablesMap = await buildVariablesMap(groupConfig.vsts_data!);

    // create variable group parameterts
    const params: VariableGroupParameters = {
      description: groupConfig.description,
      name: groupConfig.name,
      type: "Vsts",
      variables: variablesMap
    };

    let variableGroup: VariableGroup | undefined;
    let error: Error | undefined;
    try {
      variableGroup = await doAddVariableGroup(params, true);
    } catch (err) {
      error = err;
    }
    expect(variableGroup).toBeUndefined();
  });

  test("should pass when variable group with key vault data is set", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid(),
        org: uuid(),
        project: uuid(),
        variable_group: {
          description: uuid(),
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
          name: uuid()
        }
      }
    });

    const groupConfig = Config().azure_devops!.variable_group!;
    const variablesMap = await buildKeyVaultVariablesMap(
      groupConfig.key_vault_data!.secrets
    );

    // create variable group parameterts
    const params: VariableGroupParameters = {
      description: groupConfig.description,
      name: groupConfig.name,
      type: "AzureKeyVault",
      variables: variablesMap
    };

    let variableGroup: VariableGroup | undefined;
    let error: Error | undefined;
    try {
      variableGroup = await doAddVariableGroup(params, true);
    } catch (err) {
      error = err;
    }
    expect(variableGroup).toBeUndefined();
  });
});

describe("authorizeAccessToAllPipelines", () => {
  test("should pass when valid variable group is passed", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        access_token: uuid(),
        org: uuid(),
        project: uuid(),
        variable_group: {
          description: uuid(),
          name: uuid(),
          vsts_data: {
            var1: {
              isSecret: false,
              value: "val1"
            },
            var2: {
              isSecret: true,
              value: "val2"
            }
          }
        }
      }
    });

    const groupConfig = Config().azure_devops!.variable_group!;
    const variablesMap = await buildVariablesMap(groupConfig.vsts_data!);

    // create variable group parameterts
    const variableGroup: VariableGroup = {
      description: groupConfig.description,
      name: groupConfig.name,
      type: "Vsts",
      variables: variablesMap
    };

    let authorized: boolean | undefined;
    let error: Error | undefined;
    try {
      authorized = await authorizeAccessToAllPipelines(variableGroup);
    } catch (err) {
      error = err;
    }
    expect(authorized).toBeUndefined();
  });

  test("should fail when passing null variable group", async () => {
    // create variable group parameterts
    const variableGroup: VariableGroup | undefined = {};

    let error: Error | undefined;
    try {
      await authorizeAccessToAllPipelines(variableGroup);
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
  });
});

describe("buildKeyVaultVariablesMap", () => {
  test("should create variable map with two secrets", async () => {
    const secrets: string[] = ["secret1", "secret2"];
    let secretsMap: IVariablesMap | undefined;
    const expectedMap: any = `{"secret1":{"enabled":true,"isSecret":true},"secret2":{"enabled":true,"isSecret":true}}`;
    secretsMap = await buildKeyVaultVariablesMap(secrets);
    expect(JSON.stringify(secretsMap)).toEqual(expectedMap);
  });

  test("should create variable map with one secret", async () => {
    const secrets: string[] = ["secret1"];
    let secretsMap: IVariablesMap | undefined;
    const expectedMap: any = `{"secret1":{"enabled":true,"isSecret":true}}`;
    secretsMap = await buildKeyVaultVariablesMap(secrets);
    expect(JSON.stringify(secretsMap)).toEqual(expectedMap);
  });

  test("should create empty variable map with no secrets", async () => {
    const secrets: string[] = [];
    let secretsMap: IVariablesMap | undefined;
    const expectedMap: any = `{}`;
    secretsMap = await buildKeyVaultVariablesMap(secrets);
    expect(JSON.stringify(secretsMap)).toEqual(expectedMap);
  });
});

describe("buildVariablesMap", () => {
  test("should create variable map with two variables", async () => {
    const var1: IVariablesMap = {
      var1: {
        isSecret: false,
        value: "val1"
      }
    };
    const var2: IVariablesMap = {
      var2: {
        isSecret: true,
        value: "val2"
      }
    };

    const variables: IVariablesMap[] = [];
    variables.push(var1);
    variables.push(var2);

    let map: IVariablesMap | undefined;
    const expectedMap: any = `{"0":{"var1":{"isSecret":false,"value":"val1"}},"1":{"var2":{"isSecret":true,"value":"val2"}}}`;
    map = await buildVariablesMap(variables);
    expect(JSON.stringify(map)).toEqual(expectedMap);
    logger.info(`map: ${JSON.stringify(map)}`);
  });

  test("should create variable map with one variable", async () => {
    const var1: IVariablesMap = {
      var1: {
        isSecret: false,
        value: "val1"
      }
    };

    const variables: IVariablesMap[] = [];
    variables.push(var1);

    let map: IVariablesMap | undefined;
    const expectedMap: any = `{"0":{"var1":{"isSecret":false,"value":"val1"}}}`;
    map = await buildVariablesMap(variables);
    expect(JSON.stringify(map)).toEqual(expectedMap);
  });

  test("should create empty variable map with no variables", async () => {
    const variables: IVariablesMap[] = [];
    let map: IVariablesMap | undefined;
    const expectedMap: any = `{}`;
    map = await buildVariablesMap(variables);
    expect(JSON.stringify(map)).toEqual(expectedMap);
  });
});
