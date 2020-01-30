import { create as createBedrockYaml } from "../../lib/bedrockYaml";
import { createTempDir } from "../../lib/ioUtil";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
jest.mock("../../lib/pipelines/pipelines");

import {
  createPipelineForDefinition,
  getBuildApiClient,
  queueBuild
} from "../../lib/pipelines/pipelines";

import {
  execute,
  fetchValidateValues,
  ICommandOptions,
  installLifecyclePipeline,
  validate
} from "./pipeline";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

const mockValues: ICommandOptions = {
  buildScriptUrl: "buildScriptUrl",
  devopsProject: "azDoProject",
  orgName: "orgName",
  personalAccessToken: "PAT",
  pipelineName: "pipelineName",
  repoName: "repoName",
  repoUrl: "repoUrl"
};

const mockMissingValues: ICommandOptions = {
  buildScriptUrl: undefined,
  devopsProject: undefined,
  orgName: undefined,
  personalAccessToken: undefined,
  pipelineName: undefined,
  repoName: undefined,
  repoUrl: undefined
};

const gitUrl = "https://github.com/CatalystCode/spk.git";

describe("test valid function", () => {
  it("negative test", () => {
    try {
      const tmpDir = createBedrockYaml();
      validate(tmpDir);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });
});

describe("test fetchValidateValues function", () => {
  it("negative test: SPK Config is missing", () => {
    try {
      fetchValidateValues(mockValues, gitUrl, undefined);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });
  it("SPK Config's azure_devops do not have value", () => {
    const values = fetchValidateValues(mockValues, gitUrl, {
      azure_devops: {}
    });
    expect(values).toEqual(mockValues);
  });
  it("SPK Config's azure_devops do not have value and command line does not have values", () => {
    const values = fetchValidateValues(mockMissingValues, gitUrl, {
      azure_devops: {}
    });
    expect(values).toBeNull();
  });
});

describe("installLifecyclePipeline and execute tests", () => {
  it("test execute function: missing project path", async () => {
    const exitFn = jest.fn();
    await execute(mockValues, "", exitFn);
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[1]]);
  });
  it("test execute function: positive test", async () => {
    const exitFn = jest.fn();
    (createPipelineForDefinition as jest.Mock).mockReturnValue({ id: 10 });

    const tmpDir = createTempDir();
    logger.info(`tmpDir11: ${tmpDir}`);
    createBedrockYaml(tmpDir, {
      rings: {},
      services: {},
      variableGroups: ["test"]
    });
    logger.info(`tmpDir: ${tmpDir}`);
    await execute(mockValues, tmpDir, exitFn);

    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[0]]);
  });
  it("should create a pipeline", async () => {
    (createPipelineForDefinition as jest.Mock).mockReturnValue({ id: 10 });
    try {
      await installLifecyclePipeline(mockValues);
    } catch (_) {
      expect(true).toBe(false);
    }
  });

  it("should fail if the build client cant be instantiated", async () => {
    (getBuildApiClient as jest.Mock).mockReturnValue(Promise.reject());

    try {
      await installLifecyclePipeline(mockValues);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });

  it("should fail if the pipeline definition cannot be created", async () => {
    (getBuildApiClient as jest.Mock).mockReturnValue({});
    (createPipelineForDefinition as jest.Mock).mockReturnValue(
      Promise.reject()
    );

    try {
      await installLifecyclePipeline(mockValues);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });

  it("should fail if a build cannot be queued on the pipeline", async () => {
    (getBuildApiClient as jest.Mock).mockReturnValue({});
    (createPipelineForDefinition as jest.Mock).mockReturnValue({ id: 10 });
    (queueBuild as jest.Mock).mockReturnValue(Promise.reject());

    try {
      await installLifecyclePipeline(mockValues);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });

  it("should fail if a build definition id doesn't exist", async () => {
    (getBuildApiClient as jest.Mock).mockReturnValue({});
    (createPipelineForDefinition as jest.Mock).mockReturnValue({
      fakeProperty: "temp"
    });
    (queueBuild as jest.Mock).mockReturnValue(Promise.reject());

    try {
      await installLifecyclePipeline(mockValues);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeDefined();
      const builtDefnString = JSON.stringify({ fakeProperty: "temp" });
      expect(e.message).toBe(
        `Invalid BuildDefinition created, parameter 'id' is missing from ${builtDefnString}`
      );
    }
  });
});
