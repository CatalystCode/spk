import { disableVerboseLogging, enableVerboseLogging } from "../../logger";

jest.mock("../../lib/pipelines/pipelines");

import {
  createPipelineForDefinition,
  definitionForAzureRepoPipeline,
  getBuildApiClient,
  queueBuild
} from "../../lib/pipelines/pipelines";

import {
  ICommandOptions,
  installBuildUpdatePipeline,
  requiredPipelineVariables
} from "./pipeline";

const MOCKED_VALUES: ICommandOptions = {
  buildScriptUrl: "buildScriptUrl",
  devopsProject: "project",
  orgName: "orgName",
  packagesDir: "packagesDir",
  personalAccessToken: "personalAccessToken",
  pipelineName: "pipelineName",
  repoName: "repositoryName",
  repoUrl: "https://dev.azure.com/test/fabrikam/_git/app"
};

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("required pipeline variables", () => {
  it("should use have the proper pipeline vars vars", () => {
    const variables = requiredPipelineVariables("buildScriptUrl");

    expect(Object.keys(variables).length).toBe(1);

    expect(variables.BUILD_SCRIPT_URL.value).toBe("buildScriptUrl");
    expect(variables.BUILD_SCRIPT_URL.isSecret).toBe(false);
    expect(variables.BUILD_SCRIPT_URL.allowOverride).toBe(true);
  });
});

fdescribe("create pipeline tests", () => {
  it("should create a pipeline", async () => {
    (createPipelineForDefinition as jest.Mock).mockReturnValue({ id: 10 });
    await installBuildUpdatePipeline("serviceName", MOCKED_VALUES);
  });
  it("should fail if the build client cant be instantiated", async () => {
    (getBuildApiClient as jest.Mock).mockReturnValue(Promise.reject());

    try {
      await installBuildUpdatePipeline("serviceName", MOCKED_VALUES);
      expect(true).toBe(false);
    } catch (_) {
      // expecting exception to be thrown
    }
  });
  it("should fail if the pipeline definition cannot be created", async () => {
    (getBuildApiClient as jest.Mock).mockReturnValue({});
    (createPipelineForDefinition as jest.Mock).mockReturnValue(
      Promise.reject()
    );

    try {
      await installBuildUpdatePipeline("serviceName", MOCKED_VALUES);
      expect(true).toBe(false);
    } catch (_) {
      // expecting exception to be thrown
    }
  });
  it("should fail if a build cannot be queued on the pipeline", async () => {
    (getBuildApiClient as jest.Mock).mockReturnValue({});
    (createPipelineForDefinition as jest.Mock).mockReturnValue({ id: 10 });
    (queueBuild as jest.Mock).mockReturnValue(Promise.reject());

    try {
      await installBuildUpdatePipeline("serviceName", MOCKED_VALUES);
      expect(true).toBe(false);
    } catch (_) {
      // expecting exception to be thrown
    }
  });
});
