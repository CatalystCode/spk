import path from "path";
import { readYaml } from "../config";
import * as config from "../config";
import * as azdoClient from "../lib/azdoClient";
import { createTempDir } from "../lib/ioUtil";
import { WORKSPACE } from "../lib/setup/constants";
import * as fsUtil from "../lib/setup/fsUtil";
import * as gitService from "../lib/setup/gitService";
import * as projectService from "../lib/setup/projectService";
import * as promptInstance from "../lib/setup/prompt";
import * as scaffold from "../lib/setup/scaffold";
import * as setupLog from "../lib/setup/setupLog";
import { IConfigYaml } from "../types";
import { createSPKConfig, execute, getErrorMessage } from "./setup";
import * as setup from "./setup";

const mockRequestContext = {
  accessToken: "pat",
  orgName: "orgname",
  projectName: "project",
  workspace: WORKSPACE
};

describe("test createSPKConfig function", () => {
  it("positive test", () => {
    const tmpFile = path.join(createTempDir(), "config.yaml");
    jest.spyOn(config, "defaultConfigFile").mockReturnValueOnce(tmpFile);
    createSPKConfig(mockRequestContext);
    const data = readYaml<IConfigYaml>(tmpFile);
    expect(data.azure_devops).toStrictEqual({
      access_token: "pat",
      org: "orgname",
      project: "project"
    });
  });
});

const testExecuteFunc = async (usePrompt = true, hasProject = true) => {
  jest
    .spyOn(gitService, "getGitApi")
    .mockReturnValueOnce(Promise.resolve({} as any));
  jest.spyOn(fsUtil, "createDirectory").mockReturnValueOnce();
  jest.spyOn(scaffold, "hldRepo").mockReturnValueOnce(Promise.resolve());
  jest.spyOn(scaffold, "manifestRepo").mockReturnValueOnce(Promise.resolve());
  jest.spyOn(setupLog, "create").mockReturnValueOnce();

  const exitFn = jest.fn();

  if (usePrompt) {
    jest
      .spyOn(promptInstance, "prompt")
      .mockReturnValueOnce(Promise.resolve(mockRequestContext));
  } else {
    jest
      .spyOn(promptInstance, "getAnswerFromFile")
      .mockReturnValueOnce(mockRequestContext);
  }
  jest.spyOn(setup, "createSPKConfig").mockReturnValueOnce();
  jest.spyOn(azdoClient, "getWebApi").mockReturnValueOnce(
    Promise.resolve({
      getCoreApi: async () => {
        return {};
      }
    } as any)
  );
  if (hasProject) {
    jest
      .spyOn(projectService, "getProject")
      .mockReturnValueOnce(Promise.resolve({} as any));
  } else {
    jest
      .spyOn(projectService, "getProject")
      .mockReturnValueOnce(Promise.resolve(undefined as any));
  }
  const fncreateProject = jest
    .spyOn(projectService, "createProject")
    .mockReturnValueOnce(Promise.resolve());

  if (usePrompt) {
    await execute(
      {
        file: undefined
      },
      exitFn
    );
  } else {
    await execute(
      {
        file: "dummy"
      },
      exitFn
    );
  }

  if (hasProject) {
    expect(fncreateProject).toBeCalledTimes(0);
  } else {
    expect(fncreateProject).toBeCalledTimes(1);
  }
  fncreateProject.mockReset();
  expect(exitFn).toBeCalledTimes(1);
  expect(exitFn.mock.calls).toEqual([[0]]);
};

describe("test execute function", () => {
  it("positive test: interactive mode: project already exist", async () => {
    await testExecuteFunc();
  });
  it("positive test: interactive mode: project do not exist", async () => {
    await testExecuteFunc(true, false);
  });
  it("positive test: file mode: project already exist", async () => {
    await testExecuteFunc(false);
  });
  it("positive test: file mode: project do not exist", async () => {
    await testExecuteFunc(false, false);
  });
  it("negative test: 401 status code", async () => {
    const exitFn = jest.fn();

    jest
      .spyOn(promptInstance, "prompt")
      .mockReturnValueOnce(Promise.resolve(mockRequestContext));
    jest.spyOn(setup, "createSPKConfig").mockReturnValueOnce();
    jest.spyOn(azdoClient, "getWebApi").mockReturnValueOnce(
      Promise.resolve({
        getCoreApi: () => {
          throw {
            message: "Authentication failure",
            statusCode: 401
          };
        }
      } as any)
    );
    jest.spyOn(setupLog, "create").mockReturnValueOnce();

    await execute(
      {
        file: undefined
      },
      exitFn
    );

    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[1]]);
  });
  it("negative test: VS402392 error", async () => {
    const exitFn = jest.fn();

    jest
      .spyOn(promptInstance, "prompt")
      .mockReturnValueOnce(Promise.resolve(mockRequestContext));
    jest.spyOn(setup, "createSPKConfig").mockReturnValueOnce();
    jest.spyOn(azdoClient, "getWebApi").mockReturnValueOnce(
      Promise.resolve({
        getCoreApi: () => {
          throw {
            message: "VS402392: "
          };
        }
      } as any)
    );
    jest.spyOn(setupLog, "create").mockReturnValueOnce();

    await execute(
      {
        file: undefined
      },
      exitFn
    );

    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[1]]);
  });
  it("negative test: other error", async () => {
    const exitFn = jest.fn();

    jest
      .spyOn(promptInstance, "prompt")
      .mockReturnValueOnce(Promise.resolve(mockRequestContext));
    jest.spyOn(setup, "createSPKConfig").mockReturnValueOnce();
    jest.spyOn(azdoClient, "getWebApi").mockReturnValueOnce(
      Promise.resolve({
        getCoreApi: () => {
          throw {
            message: "other error"
          };
        }
      } as any)
    );
    jest.spyOn(setupLog, "create").mockReturnValueOnce();

    await execute(
      {
        file: undefined
      },
      exitFn
    );

    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[1]]);
  });
});

describe("test getErrorMessage function", () => {
  it("without request context", () => {
    const res = getErrorMessage(undefined, new Error("test"));
    expect(res).toBe("Error: test");
  });
  it("with VS402392 error", () => {
    const res = getErrorMessage(
      {
        accessToken: "pat",
        orgName: "orgName",
        projectName: "projectName",
        workspace: WORKSPACE
      },
      {
        message: "VS402392: ",
        statusCode: 400
      }
    );
    expect(res).toBe(
      "Project, projectName might be deleted less than 28 days ago. Choose a different project name."
    );
  });
});
