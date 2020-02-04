////////////////////////////////////////////////////////////////////////////////
// !!NOTE!!
// This test suite uses mock-fs to mock out the the file system
// console.log CANNOT be reliably called in this suite
// - https://github.com/facebook/jest/issues/5792
// - https://github.com/tschaub/mock-fs/issues/234
//
// Workaround: The global logger object in `src/logger` does work, so use that
// to debug
////////////////////////////////////////////////////////////////////////////////
import fs from "fs";
import yaml from "js-yaml";
import mockFs from "mock-fs";
import os from "os";
import path from "path";
import shelljs from "shelljs";
import uuid from "uuid/v4";
import {
  HLD_PIPELINE_FILENAME,
  PROJECT_PIPELINE_FILENAME,
  SERVICE_PIPELINE_FILENAME,
  VM_IMAGE
} from "../lib/constants";
import { disableVerboseLogging, enableVerboseLogging, logger } from "../logger";
import {
  createTestHldAzurePipelinesYaml,
  createTestHldLifecyclePipelineYaml,
  createTestMaintainersYaml
} from "../test/mockFactory";
import { IAzurePipelinesYaml, IMaintainersFile } from "../types";
import {
  addNewServiceToMaintainersFile,
  generateDefaultHldComponentYaml,
  generateDockerfile,
  generateGitIgnoreFile,
  generateHldAzurePipelinesYaml,
  generateHldLifecyclePipelineYaml,
  generateServiceBuildAndUpdatePipelineYaml,
  serviceBuildAndUpdatePipeline
} from "./fileutils";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("generateHldLifecyclePipelineYaml", () => {
  const targetDirectory = "app-repository";
  const writeSpy = jest.spyOn(fs, "writeFileSync");

  beforeEach(() => {
    mockFs({
      "app-repository": {}
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should not do anything if hld-lifecycle.yaml exists", async () => {
    const mockFsOptions = {
      [`${targetDirectory}/${PROJECT_PIPELINE_FILENAME}`]: "existing pipeline"
    };
    mockFs(mockFsOptions);

    generateHldLifecyclePipelineYaml(targetDirectory);
    expect(writeSpy).not.toBeCalled();
  });

  it("should generate the hld-lifecycle.yaml if one does not exist", async () => {
    const expectedFilePath = `${targetDirectory}/${PROJECT_PIPELINE_FILENAME}`;

    generateHldLifecyclePipelineYaml(targetDirectory);
    expect(writeSpy).toBeCalledWith(
      expectedFilePath,
      createTestHldLifecyclePipelineYaml(),
      "utf8"
    );
    expect(writeSpy).toBeCalled();
  });
});

describe("generateHldAzurePipelinesYaml", () => {
  const targetDirectory = "hld-repository";
  const writeSpy = jest.spyOn(fs, "writeFileSync");
  beforeEach(() => {
    mockFs({
      "hld-repository": {}
    });
  });
  afterEach(() => {
    mockFs.restore();
  });

  it("should not do anything if file exist", async () => {
    const mockFsOptions = {
      [`${targetDirectory}/${HLD_PIPELINE_FILENAME}`]: "existing pipeline"
    };
    mockFs(mockFsOptions);

    generateHldAzurePipelinesYaml(targetDirectory);
    expect(writeSpy).not.toBeCalled();
  });

  it("should generate the file if one does not exist", async () => {
    const absTargetPath = path.resolve(targetDirectory);
    const expectedFilePath = `${absTargetPath}/${HLD_PIPELINE_FILENAME}`;

    generateHldAzurePipelinesYaml(targetDirectory);
    expect(writeSpy).toBeCalledWith(
      expectedFilePath,
      createTestHldAzurePipelinesYaml(),
      "utf8"
    );
    expect(writeSpy).toBeCalled();
  });
});

describe("generateDefaultHldComponentYaml", () => {
  const targetDirectory = "hld-repository";
  const writeSpy = jest.spyOn(fs, "writeFileSync");
  beforeEach(() => {
    mockFs({
      "hld-repository": {}
    });
  });
  afterEach(() => {
    mockFs.restore();
  });

  it("should not do anything if file exist", async () => {
    const mockFsOptions = {
      [`${targetDirectory}/component.yaml`]: "existing component"
    };
    mockFs(mockFsOptions);

    generateDefaultHldComponentYaml(targetDirectory);
    expect(writeSpy).not.toBeCalled();
  });

  it("should generate the file if one does not exist", async () => {
    generateDefaultHldComponentYaml(targetDirectory);
    expect(writeSpy).toBeCalled();
  });
});

describe("Adding a new service to a Maintainer file", () => {
  beforeAll(() => {
    mockFs({
      "maintainers.yaml": createTestMaintainersYaml() as any
    });
  });

  afterAll(() => {
    mockFs.restore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update existing maintainers.yml with new service maintainers", async () => {
    const maintainersFilePath = "maintainers.yaml";

    const servicePath = "packages/my-new-service";
    const newUser = {
      email: "hello@example.com",
      name: "testUser"
    };

    const writeSpy = jest.spyOn(fs, "writeFileSync");
    addNewServiceToMaintainersFile(maintainersFilePath, servicePath, [newUser]);

    const defaultMaintainersFileObject = createTestMaintainersYaml(false);

    const expected: IMaintainersFile = {
      services: {
        ...((defaultMaintainersFileObject as any) as IMaintainersFile).services,
        ["./" + servicePath]: {
          maintainers: [newUser]
        }
      }
    };

    expect(writeSpy).toBeCalledWith(
      maintainersFilePath,
      yaml.safeDump(expected),
      "utf8"
    );
  });
});

describe("generating service gitignore file", () => {
  const targetDirectory = "my-new-service";

  beforeEach(() => {
    mockFs({
      "my-new-service": {}
    });
  });
  afterEach(() => {
    mockFs.restore();
  });

  const content = "hello world";

  it("should not do anything if file exist", async () => {
    const mockFsOptions = {
      [`${targetDirectory}/.gitignore`]: "foobar"
    };
    mockFs(mockFsOptions);

    const writeSpy = jest.spyOn(fs, "writeFileSync");
    generateGitIgnoreFile(targetDirectory, content);
    expect(writeSpy).not.toBeCalled();
  });

  it("should generate the file if one does not exist", async () => {
    const writeSpy = jest.spyOn(fs, "writeFileSync");
    generateGitIgnoreFile(targetDirectory, content);

    const absTargetPath = path.resolve(targetDirectory);
    const expectedGitIgnoreFilePath = `${absTargetPath}/.gitignore`;

    expect(writeSpy).toBeCalledWith(expectedGitIgnoreFilePath, content, "utf8");
  });
});

describe("generating service Dockerfile", () => {
  const targetDirectory = "my-new-service";

  beforeEach(() => {
    mockFs({
      "my-new-service": {}
    });
  });
  afterEach(() => {
    mockFs.restore();
  });

  it("should not do anything if file exist", async () => {
    const mockFsOptions = {
      [`${targetDirectory}/Dockerfile`]: "hello!!!!"
    };
    mockFs(mockFsOptions);

    const writeSpy = jest.spyOn(fs, "writeFileSync");
    generateDockerfile(targetDirectory);
    expect(writeSpy).not.toBeCalled();
  });

  it("should generate the file if one does not exist", async () => {
    const writeSpy = jest.spyOn(fs, "writeFileSync");
    generateDockerfile(targetDirectory);

    const absTargetPath = path.resolve(targetDirectory);
    const expectedGitIgnoreFilePath = `${absTargetPath}/Dockerfile`;

    expect(writeSpy).toBeCalledWith(
      expectedGitIgnoreFilePath,
      "FROM alpine\nRUN echo 'hello world'",
      "utf8"
    );
  });
});

describe("serviceBuildUpdatePipeline", () => {
  // Create a random workspace dir before every test
  let randomDirPath = "";
  beforeEach(() => {
    randomDirPath = path.join(os.tmpdir(), uuid());
    shelljs.mkdir("-p", randomDirPath);
  });

  test("that the value of the file is the same after (de)serialization", async () => {
    const serviceName = "mycoolservice";
    const servicePath = "./mycoolservice";
    const variableGroups = ["foo", "bar"];
    const starter = await serviceBuildAndUpdatePipeline(
      serviceName,
      servicePath,
      variableGroups
    );
    const serializedYaml = yaml.safeDump(starter, {
      lineWidth: Number.MAX_SAFE_INTEGER
    });
    const pipelinesPath = path.join(randomDirPath, SERVICE_PIPELINE_FILENAME);
    fs.writeFileSync(pipelinesPath, serializedYaml);
    const deserializedYaml = yaml.safeLoad(
      fs.readFileSync(pipelinesPath, "utf8")
    );

    // should be equal to the initial value
    expect(deserializedYaml).toStrictEqual(starter);

    // variables should include all groups
    for (const group of variableGroups) {
      expect(starter.variables!.includes({ group }));
    }

    // verify components of stages
    expect(starter.stages && starter.stages.length === 2);
    for (const stage of starter.stages!) {
      for (const job of stage.jobs) {
        // pool.vmImage should be 'gentoo'
        expect(job.pool!.vmImage).toBe(VM_IMAGE);
        expect(job.steps);
      }
    }
  });

  test("that all services receive an build-update-hld-pipeline.yaml with the correct paths and variable groups have been inserted", async () => {
    // Create service directories
    const serviceReferences = ["serviceA", "serviceB", "serviceC"].map(
      serviceName => {
        const servicePath = path.join(randomDirPath, "packages", serviceName);
        shelljs.mkdir("-p", servicePath);
        return { serviceName, servicePath };
      }
    );

    const variableGroups = [uuid(), uuid()];

    for (const serviceReference of serviceReferences) {
      await generateServiceBuildAndUpdatePipelineYaml(
        randomDirPath,
        serviceReference.serviceName,
        serviceReference.servicePath,
        variableGroups
      );

      // file should exist
      expect(fs.existsSync(serviceReference.servicePath)).toBe(true);

      // pipeline triggers should include the relative path to the service
      const azureYaml: IAzurePipelinesYaml = yaml.safeLoad(
        fs.readFileSync(
          path.join(serviceReference.servicePath, SERVICE_PIPELINE_FILENAME),
          "utf8"
        )
      );
      const hasCorrectIncludes = azureYaml.trigger!.paths!.include!.includes(
        "./" + path.relative(randomDirPath, serviceReference.servicePath)
      );
      expect(hasCorrectIncludes).toBe(true);

      let hasCorrecctVariableGroup1: boolean = false;
      let hasCorrecctVariableGroup2: boolean = false;
      for (const [key, value] of Object.entries(azureYaml.variables!)) {
        const item: { group: string } = value as { group: string };

        if (item.group === variableGroups[0]) {
          hasCorrecctVariableGroup1 = true;
        }

        if (item.group === variableGroups[1]) {
          hasCorrecctVariableGroup2 = true;
        }
      }

      expect(hasCorrectIncludes).toBe(true);
      expect(hasCorrecctVariableGroup1).toBe(true);
      expect(hasCorrecctVariableGroup2).toBe(true);
    }
  });
});
