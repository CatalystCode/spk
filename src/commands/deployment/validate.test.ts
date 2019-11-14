// imports
import { logger } from "@azure/keyvault-secrets";
import * as path from "path";
import uuid from "uuid/v4";
import { Config, loadConfiguration } from "../../config";
import * as storage from "../../lib/azure/storage";
import { disableVerboseLogging, enableVerboseLogging } from "../../logger";
import { isValidConfig, isValidStorageAccount } from "./validate";

// Mocks
jest.mock("../../config");

jest.spyOn(storage, "getStorageManagementClient").mockImplementation(
  async (): Promise<any> => {
    return undefined;
  }
);

jest.spyOn(storage, "getStorageAccountKeys").mockImplementation(
  async (accountName: string, resourceGroup: string): Promise<string[]> => {
    if (accountName === "epi-test") {
      return ["mock access key", "mock access key2"];
    }

    return [];
  }
);

jest.spyOn(storage, "isStorageAccountNameAvailable").mockImplementation(
  async (accountName: string): Promise<boolean> => {
    if (accountName === "epi-test" || accountName === "epi-test-no-keys") {
      return false;
    }

    return true;
  }
);

// Tests
beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("Validate deployment configuration", () => {
  test("valid deployment configuration", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        org: uuid(),
        project: uuid()
      },
      introspection: {
        azure: {
          account_name: uuid(),
          key: uuid(),
          partition_key: uuid(),
          table_name: uuid()
        }
      }
    });
    const isValid = await isValidConfig();
    logger.info(`ret val: ${isValid}`);
    expect(isValid).toBe(true);
  });
});

describe("Validate missing deployment configuration", () => {
  test("no deployment configuration", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: undefined
    });
    const isValid = await isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: {
        azure: undefined
      }
    });
    const isValid = await isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage.account_name configuration", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: {
        azure: {
          account_name: undefined
        }
      }
    });
    const isValid = await isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage.table_name configuration", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: {
        azure: {
          table_name: undefined
        }
      }
    });
    const isValid = await isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage.partition_key configuration", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: {
        azure: {
          partition_key: undefined
        }
      }
    });
    const isValid = await isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage.key configuration", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: {
        azure: {
          key: undefined
        }
      }
    });
    const isValid = await isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.pipeline configuration", () => {
  test("missing deployment.pipeline configuration", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: undefined
    });
    const isValid = await isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.pipeline configuration", () => {
  test("missing deployment.pipeline.org configuration", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        org: undefined
      }
    });
    const isValid = await isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.pipeline configuration", () => {
  test("missing deployment.pipeline.project configuration", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {
        project: undefined
      }
    });
    const isValid = await isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate storage account", () => {
  test("non-existing storage account", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: {
        azure: {
          account_name: "non-existing-account-name"
        }
      }
    });
    const isValid = await isValidStorageAccount();

    expect(isValid).toBe(false);
  });

  test("existing storage account no keys", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: {
        azure: {
          account_name: "epi-test-no-keys"
        }
      }
    });
    const isValid = await isValidStorageAccount();

    expect(isValid).toBe(false);
  });

  test("existing storage account with valid key", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: {
        azure: {
          account_name: "epi-test",
          key: "mock access key2"
        }
      }
    });
    const isValid = await isValidStorageAccount();

    expect(isValid).toBe(true);
  });

  test("existing storage account with invalid key", async () => {
    (Config as jest.Mock).mockReturnValue({
      introspection: {
        azure: {
          account_name: "epi-test",
          key: "mock access key3"
        }
      }
    });

    const isValid = await isValidStorageAccount();
    expect(isValid).toBe(false);
  });
});
