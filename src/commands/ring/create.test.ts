import { create as createBedrockYaml } from "../../lib/bedrockYaml";
import { createTempDir } from "../../lib/ioUtil";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";

import { checkDependencies, execute } from "./create";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("checkDependencies", () => {
  it("Project not initialized, it should fail.", async () => {
    try {
      const tmpDir = createBedrockYaml();
      checkDependencies(tmpDir, "");
      expect(true).toBe(false); // Should not reach here
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });
  it("Project initialized, it should pass.", async () => {
    try {
      const tmpDir = createBedrockYaml();
      createBedrockYaml(tmpDir, {
        rings: {
          master: {
            isDefault: true
          }
        },
        services: {},
        variableGroups: ["testvg"]
      });
      checkDependencies(tmpDir, "not-master");
      expect(true).toBe(true);
    } catch (e) {
      expect(true).toBe(false); // Should not reach here
    }
  });
  it("Project initialized, but ring already exists, it should fail.", async () => {
    try {
      const tmpDir = createBedrockYaml();
      createBedrockYaml(tmpDir, {
        rings: {
          master: {
            isDefault: true
          }
        },
        services: {},
        variableGroups: ["testvg"]
      });
      checkDependencies(tmpDir, "master");
      expect(true).toBe(false); // Should not reach here
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });
});

describe("test execute function and logic", () => {
  it("test execute function: missing project path", async () => {
    const exitFn = jest.fn();
    await execute("ring", "", exitFn);
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[1]]);
  });
  it("test execute function: working path with bedrock.yaml", async () => {
    const exitFn = jest.fn();

    const tmpDir = createTempDir();
    createBedrockYaml(tmpDir, {
      rings: {
        master: {
          isDefault: true
        }
      },
      services: {},
      variableGroups: ["testvg"]
    });
    await execute("ring", tmpDir, exitFn);

    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[0]]);
  });
});
