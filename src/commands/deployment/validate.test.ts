import * as path from "path";
import {
  config,
  defaultFileLocation,
  loadConfiguration,
  writeConfigToDefaultLocation
} from "./../init";
import { isValidConfig } from "./validate";

beforeEach(() => {
  process.env.test_name = "testStorageName";
  process.env.test_key = "testStorageKey";
  const mockFileName = "src/commands/mocks/spk-config-deployment.yaml";
  const filename = path.resolve(mockFileName);
  loadConfiguration(filename);
});

describe("Validate deployment configuration", () => {
  test("valid deployment configuration", async () => {
    var isValid = isValidConfig();
    expect(isValid).toBe(true);
  });
});

describe("Validate missing deployment configuration", () => {
  test("no deployment configuration", async () => {
    config.deployment = undefined;
    var isValid = isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage", async () => {
    config.deployment!.storage = undefined;
    var isValid = isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage.account_name configuration", async () => {
    config.deployment!.storage!.account_name = undefined;
    var isValid = isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage.table_name configuration", async () => {
    config.deployment!.storage!.table_name = undefined;
    var isValid = isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage.partition_key configuration", async () => {
    config.deployment!.storage!.partition_key = undefined;
    var isValid = isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.storage configuration", () => {
  test("missing deployment.storage.key configuration", async () => {
    config.deployment!.storage!.key = undefined;
    var isValid = isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.pipeline configuration", () => {
  test("missing deployment.pipeline configuration", async () => {
    config.deployment!.pipeline = undefined;
    var isValid = isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.pipeline configuration", () => {
  test("missing deployment.pipeline.org configuration", async () => {
    config.deployment!.pipeline!.org = undefined;
    var isValid = isValidConfig();

    expect(isValid).toBe(false);
  });
});

describe("Validate missing deployment.pipeline configuration", () => {
  test("missing deployment.pipeline.project configuration", async () => {
    config.deployment!.pipeline!.project = undefined;
    var isValid = isValidConfig();

    expect(isValid).toBe(false);
  });
});
