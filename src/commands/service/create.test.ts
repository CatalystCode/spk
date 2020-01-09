import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import uuid from "uuid/v4";
import { checkoutCommitPushCreatePRLink } from "../../lib/gitutils";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import {
  createTestBedrockYaml,
  createTestMaintainersYaml
} from "../../test/mockFactory";
import { createService, isValidConfig } from "./create";
jest.mock("../../lib/gitutils");

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("validate pipeline config", () => {
  const configValues: any[] = [
    "testHelmChart",
    "testHelmRepo",
    "testHelmConfigBranch",
    "testHelmConfigGit",
    "/test/path",
    "testService",
    "test/packages",
    "test-maintainer",
    "test@maintainer.com",
    true,
    "testVariableGroup"
  ];

  it("config is valid", () => {
    expect(
      isValidConfig(
        configValues[0],
        configValues[1],
        configValues[2],
        configValues[3],
        configValues[4],
        configValues[5],
        configValues[6],
        configValues[7],
        configValues[8],
        configValues[9],
        configValues[10]
      )
    ).toBe(true);
  });

  it("undefined parameters", () => {
    for (let i = 0; i < configValues.length; i++) {
      expect(
        isValidConfig(
          i === 0 ? undefined : configValues[0],
          i === 1 ? undefined : configValues[1],
          i === 2 ? undefined : configValues[2],
          i === 3 ? undefined : configValues[3],
          i === 4 ? undefined : configValues[4],
          i === 5 ? undefined : configValues[5],
          i === 6 ? undefined : configValues[6],
          i === 7 ? undefined : configValues[7],
          i === 8 ? undefined : configValues[8],
          i === 9 ? undefined : configValues[9],
          i === 10 ? undefined : configValues[10]
        )
      ).toBe(false);
    }
  });
});

describe("Adding a service to a repo directory", () => {
  test("New directory is created under root directory with required service files.", async () => {
    // Create random directory to initialize
    const randomTmpDir = path.join(os.tmpdir(), uuid());
    fs.mkdirSync(randomTmpDir);

    await writeSampleMaintainersFileToDir(
      path.join(randomTmpDir, "maintainers.yaml")
    );
    await writeSampleBedrockFileToDir(path.join(randomTmpDir, "bedrock.yaml"));

    const packageDir = "";

    const serviceName = uuid();

    logger.info(
      `creating randomTmpDir ${randomTmpDir} and service ${serviceName}`
    );

    // addService call
    await createService(randomTmpDir, serviceName, packageDir, false);

    // Check temp test directory exists
    expect(fs.existsSync(randomTmpDir)).toBe(true);

    // Check service directory exists
    const serviceDirPath = path.join(randomTmpDir, packageDir, serviceName);
    expect(fs.existsSync(serviceDirPath)).toBe(true);

    // Verify new azure-pipelines created
    const filepaths = ["azure-pipelines.yaml", "Dockerfile"].map(filename =>
      path.join(serviceDirPath, filename)
    );

    for (const filepath of filepaths) {
      expect(fs.existsSync(filepath)).toBe(true);
    }

    // TODO: Verify root project bedrock.yaml and maintainers.yaml has been changed too.
  });

  test("New directory is created under '/packages' directory with required service files.", async () => {
    // Create random directory to initialize
    const randomTmpDir = path.join(os.tmpdir(), uuid());
    fs.mkdirSync(randomTmpDir);

    await writeSampleMaintainersFileToDir(
      path.join(randomTmpDir, "maintainers.yaml")
    );
    await writeSampleBedrockFileToDir(path.join(randomTmpDir, "bedrock.yaml"));

    const packageDir = "packages";
    const serviceName = uuid();
    const variableGroupName = uuid();

    logger.info(
      `creating randomTmpDir ${randomTmpDir} and service ${serviceName}`
    );

    // addService call
    await createService(randomTmpDir, serviceName, "packages", false);

    // Check temp test directory exists
    expect(fs.existsSync(randomTmpDir)).toBe(true);

    // Check service directory exists
    const serviceDirPath = path.join(randomTmpDir, packageDir, serviceName);
    expect(fs.existsSync(serviceDirPath)).toBe(true);

    // Verify new azure-pipelines and Dockerfile created
    const filepaths = ["azure-pipelines.yaml", "Dockerfile"].map(filename =>
      path.join(serviceDirPath, filename)
    );

    for (const filepath of filepaths) {
      expect(fs.existsSync(filepath)).toBe(true);
    }

    // TODO: Verify root project bedrock.yaml and maintainers.yaml has been changed too.
  });

  test("New directory is created under '/packages' directory with required service files and git push enabled.", async () => {
    // Create random directory to initialize
    const randomTmpDir = path.join(os.tmpdir(), uuid());
    fs.mkdirSync(randomTmpDir);

    await writeSampleMaintainersFileToDir(
      path.join(randomTmpDir, "maintainers.yaml")
    );
    await writeSampleBedrockFileToDir(path.join(randomTmpDir, "bedrock.yaml"));

    const packageDir = "packages";
    const serviceName = uuid();
    const variableGroupName = uuid();

    logger.info(
      `creating randomTmpDir ${randomTmpDir} and service ${serviceName}`
    );

    // addService call
    await createService(randomTmpDir, serviceName, "packages", true);

    // Check temp test directory exists
    expect(fs.existsSync(randomTmpDir)).toBe(true);

    // Check service directory exists
    const serviceDirPath = path.join(randomTmpDir, packageDir, serviceName);
    expect(fs.existsSync(serviceDirPath)).toBe(true);

    // Verify new azure-pipelines and Dockerfile created
    const filepaths = ["azure-pipelines.yaml", "Dockerfile"].map(filename =>
      path.join(serviceDirPath, filename)
    );

    for (const filepath of filepaths) {
      expect(fs.existsSync(filepath)).toBe(true);
    }

    expect(checkoutCommitPushCreatePRLink).toHaveBeenCalled();
  });
});

const writeSampleMaintainersFileToDir = async (maintainersFilePath: string) => {
  await promisify(fs.writeFile)(
    maintainersFilePath,
    createTestMaintainersYaml(),
    "utf8"
  );
};

const writeSampleBedrockFileToDir = async (bedrockFilePath: string) => {
  await promisify(fs.writeFile)(
    bedrockFilePath,
    createTestBedrockYaml(),
    "utf8"
  );
};
