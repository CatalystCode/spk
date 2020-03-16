/* eslint-disable @typescript-eslint/camelcase */
import axios from "axios";
import fs from "fs";
import inquirer from "inquirer";
import yaml from "js-yaml";
import path from "path";
import uuid from "uuid";
import { saveConfiguration } from "../config";
import * as config from "../config";
import * as servicePrincipalService from "../lib/azure/servicePrincipalService";
import * as subscriptionService from "../lib/azure/subscriptionService";
import { createTempDir } from "../lib/ioUtil";
import { disableVerboseLogging, enableVerboseLogging } from "../logger";
import { ConfigYaml } from "../types";
import {
  execute,
  getConfig,
  getSubscriptionId,
  handleInteractiveMode,
  handleIntrospectionInteractive,
  isIntrospectionAzureDefined,
  prompt,
  promptCreateSP,
  validatePersonalAccessToken
} from "./init";
import * as init from "./init";

jest.mock("inquirer");

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

const mockFileName = "src/commands/mocks/spk-config.yaml";
const principalId = uuid();
const principalPassword = uuid();
const principalTenantId = uuid();

describe("Test execute function", () => {
  it("negative test: missing file value", async () => {
    const exitFn = jest.fn();
    await execute(
      {
        file: undefined,
        interactive: false
      },
      exitFn
    );
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[1]]);
  });
  it("negative test: invalid file value", async () => {
    const exitFn = jest.fn();
    await execute(
      {
        file: uuid(),
        interactive: false
      },
      exitFn
    );
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[1]]);
  });
  it("negative test: having file value and interactive mode", async () => {
    const exitFn = jest.fn();
    const randomTmpDir = createTempDir();
    await execute(
      {
        file: path.join(randomTmpDir, "config.yaml"),
        interactive: true
      },
      exitFn
    );
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[1]]);
  });
  it("positive test: with file value", async () => {
    process.env.test_name = "my_storage_account";
    process.env.test_key = "my_storage_key";
    const randomTmpDir = createTempDir();
    const filename = path.resolve(mockFileName);
    saveConfiguration(filename, randomTmpDir);

    const exitFn = jest.fn();
    await execute(
      {
        file: path.join(randomTmpDir, "config.yaml"),
        interactive: false
      },
      exitFn
    );
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[0]]);
  });
  it("positive test: with interactive mode", async () => {
    jest
      .spyOn(init, "handleInteractiveMode")
      .mockReturnValueOnce(Promise.resolve());
    const exitFn = jest.fn();
    await execute(
      {
        file: "",
        interactive: true
      },
      exitFn
    );
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[0]]);
  });
});

describe("test getConfig function", () => {
  it("with configuration file", () => {
    const mockedValues = {
      azure_devops: {
        access_token: "access_token",
        org: "org",
        project: "project"
      }
    };
    jest.spyOn(config, "loadConfiguration").mockReturnValueOnce();
    jest.spyOn(config, "Config").mockReturnValueOnce(mockedValues);
    const cfg = getConfig();
    expect(cfg).toStrictEqual(mockedValues);
  });
  it("without configuration file", () => {
    jest.spyOn(config, "loadConfiguration").mockReturnValueOnce();
    jest.spyOn(config, "Config").mockImplementationOnce(() => {
      throw new Error("fake");
    });
    const cfg = getConfig();
    expect(cfg).toStrictEqual({
      azure_devops: {
        access_token: "",
        org: "",
        project: ""
      }
    });
  });
});

describe("test validatePersonalAccessToken function", () => {
  it("positive test", async done => {
    jest.spyOn(axios, "get").mockReturnValueOnce(
      Promise.resolve({
        status: 200
      })
    );
    const result = await validatePersonalAccessToken({
      access_token: "token",
      org: "org",
      project: "project"
    });
    expect(result).toBe(true);
    done();
  });
  it("negative test", async done => {
    jest
      .spyOn(axios, "get")
      .mockReturnValueOnce(Promise.reject(new Error("fake")));
    const result = await validatePersonalAccessToken({
      access_token: "token",
      org: "org",
      project: "project"
    });
    expect(result).toBe(false);
    done();
  });
});

const testHandleInteractiveModeFunc = async (
  verified: boolean
): Promise<void> => {
  jest.spyOn(init, "getConfig").mockReturnValueOnce({
    azure_devops: {
      access_token: "",
      org: "",
      project: ""
    }
  });
  jest.spyOn(init, "prompt").mockReturnValueOnce(
    Promise.resolve({
      azdo_org_name: "org_name",
      azdo_pat: "pat",
      azdo_project_name: "project",
      toSetupIntrospectionConfig: true
    })
  );
  jest
    .spyOn(init, "validatePersonalAccessToken")
    .mockReturnValueOnce(Promise.resolve(verified));
  const tmpFile = path.join(createTempDir(), "config.yaml");
  jest.spyOn(config, "defaultConfigFile").mockReturnValueOnce(tmpFile);
  jest.spyOn(init, "handleIntrospectionInteractive").mockResolvedValueOnce();
  await handleInteractiveMode();
  const content = fs.readFileSync(tmpFile, "utf8");
  const data = yaml.safeLoad(content) as ConfigYaml;
  expect(data.azure_devops?.access_token).toBe("pat");
  expect(data.azure_devops?.org).toBe("org_name");
  expect(data.azure_devops?.project).toBe("project");
};

describe("test handleInteractiveMode function", () => {
  it("postive test: verified access token", async done => {
    await testHandleInteractiveModeFunc(true);
    done();
  });
  it("negative test", async done => {
    await testHandleInteractiveModeFunc(false);
    done();
  });
});

describe("test prompt function", () => {
  it("positive test", async done => {
    const answers = {
      azdo_org_name: "org",
      azdo_pat: "pat",
      azdo_project_name: "project",
      toSetupIntrospectionConfig: false
    };
    jest.spyOn(inquirer, "prompt").mockResolvedValueOnce(answers);
    const ans = await prompt({});
    expect(ans).toStrictEqual(answers);
    done();
  });
});

const testPromptCreateSP = async (answer: boolean): Promise<void> => {
  jest.spyOn(inquirer, "prompt").mockResolvedValueOnce({
    create_service_principal: answer
  });
  const ans = await promptCreateSP();
  expect(ans).toBe(answer);
};

describe("test promptCreateSP function", () => {
  it("positive test: true", async () => {
    testPromptCreateSP(true);
  });
  it("positive test: false", async () => {
    testPromptCreateSP(false);
  });
  it("negative test: exception thrown", async () => {
    jest.spyOn(inquirer, "prompt").mockRejectedValueOnce(Error("fake"));
    await expect(promptCreateSP()).rejects.toThrow();
  });
});

describe("test isIntrospectionAzureDefined function", () => {
  it("positive test: true", () => {
    const ans = isIntrospectionAzureDefined({
      introspection: {
        azure: {
          key: new Promise(resolve => {
            resolve(undefined);
          })
        }
      }
    });
    expect(ans).toBe(true);
  });
  it("positive test: false", () => {
    const ans = isIntrospectionAzureDefined({
      introspection: {}
    });
    expect(ans).toBe(false);
    const ans1 = isIntrospectionAzureDefined({});
    expect(ans1).toBe(false);
  });
});

describe("test getSubscriptionId function", () => {
  it("positive test, single value", async () => {
    jest.spyOn(subscriptionService, "getSubscriptions").mockResolvedValueOnce([
      {
        id: "test",
        name: "test"
      }
    ]);
    const config: ConfigYaml = {
      introspection: {
        azure: {
          key: new Promise(resolve => {
            resolve(undefined);
          }),
          service_principal_id: principalId,
          service_principal_secret: principalPassword,
          tenant_id: principalTenantId
        }
      }
    };
    await getSubscriptionId(config);
    expect(config.introspection?.azure?.subscription_id).toBe("test");
  });
  it("positive test, multiple values", async () => {
    jest.spyOn(subscriptionService, "getSubscriptions").mockResolvedValueOnce([
      {
        id: "test",
        name: "test"
      },
      {
        id: "test1",
        name: "test1"
      }
    ]);
    jest.spyOn(inquirer, "prompt").mockResolvedValueOnce({
      az_subscription: "test1"
    });
    const config: ConfigYaml = {
      introspection: {
        azure: {
          key: new Promise(resolve => {
            resolve(undefined);
          }),
          service_principal_id: principalId,
          service_principal_secret: principalPassword,
          tenant_id: principalTenantId
        }
      }
    };
    await getSubscriptionId(config);
    expect(config.introspection?.azure?.subscription_id).toBe("test1");
  });
  it("negative test, no subscription found", async () => {
    jest
      .spyOn(subscriptionService, "getSubscriptions")
      .mockResolvedValueOnce([]);
    const config: ConfigYaml = {
      introspection: {
        azure: {
          key: new Promise(resolve => {
            resolve(undefined);
          }),
          service_principal_id: principalId,
          service_principal_secret: principalPassword,
          tenant_id: principalTenantId
        }
      }
    };
    await expect(getSubscriptionId(config)).rejects.toThrow();
  });
});

const testHandleIntrospectionInteractive = async (
  withIntrosepection = false,
  promptCreateSP = true
): Promise<void> => {
  const config: ConfigYaml = {};
  if (!withIntrosepection) {
    config["introspection"] = {
      azure: {
        key: new Promise(resolve => {
          resolve(undefined);
        })
      }
    };
  }
  jest.spyOn(inquirer, "prompt").mockResolvedValueOnce({
    azdo_storage_account_name: "storagetest",
    azdo_storage_table_name: "storagetabletest"
  });
  jest.spyOn(init, "promptCreateSP").mockResolvedValueOnce(promptCreateSP);
  if (promptCreateSP) {
    jest
      .spyOn(servicePrincipalService, "createWithAzCLI")
      .mockResolvedValueOnce({
        id: "id",
        password: "password",
        tenantId: "tenantId"
      });
  } else {
    jest.spyOn(inquirer, "prompt").mockResolvedValueOnce({
      az_sp_id: "id",
      az_sp_password: "password",
      az_sp_tenant: "tenantId"
    });
  }
  jest.spyOn(init, "getSubscriptionId").mockImplementationOnce(
    async (curConfig: ConfigYaml): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const azure = curConfig.introspection!.azure!;
      azure.subscription_id = "subscriptionId";
    }
  );
  await handleIntrospectionInteractive(config);
  expect(config.introspection?.azure?.subscription_id).toBe("subscriptionId");
  expect(config.introspection?.azure?.service_principal_id).toBe("id");
  expect(config.introspection?.azure?.service_principal_secret).toBe(
    "password"
  );
  expect(config.introspection?.azure?.tenant_id).toBe("tenantId");
};

describe("test handleIntrospectionInteractive function", () => {
  it("positive test", async () => {
    await testHandleIntrospectionInteractive(false, true);
    await testHandleIntrospectionInteractive(true, false);
    await testHandleIntrospectionInteractive(false, true);
    await testHandleIntrospectionInteractive(false, false);
  });
});
