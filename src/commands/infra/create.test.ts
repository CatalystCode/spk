import child_process from "child_process";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import path from "path";
import { validateInit, templateInit } from "./create";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("Validating Bedrock source repo path", () => {
  test("Static bedrock path to spk root is passed", async () => {
    // Pass a static path to Bedrock source
    const bedrockTestDir = path.join(
      process.cwd(),
      ".bedrock/bedrock/cluster/environments"
    );
    logger.info(`Using test Bedrock Source Template Path : ${bedrockTestDir}`);
    const test1 = await validateInit(bedrockTestDir);
    expect(test1).toBe(true);
  });
});
describe("Validating Bedrock source repo path with invalid test", () => {
  test("Static bedrock path to spk root is passed that is invalid", async () => {
    // Pass an invalid static path to Bedrock source
    const bedrockTestDir = path.join(
      process.cwd(),
      ".bedrock/bedrock/invalid/path"
    );
    logger.info(`Using test Bedrock Source Template Path : ${bedrockTestDir}`);
    const test2 = await validateInit(bedrockTestDir);
    expect(test2).toBe(false);
  });
});
describe("Validating Bedrock environment template with Terraform init", () => {
  test("Pass a Bedrock Environment to run a terraform init on the directory", async () => {
    // Pass a Bedrock template to run terraform init
    const bedrockTestDir = path.join(
      process.cwd(),
      ".bedrock/bedrock/cluster/environments"
    );
    const bedrockTestEnv = "azure-simple";
    logger.info(`Using test Bedrock Template Environment : ${bedrockTestEnv}`);
    const test3 = await templateInit(bedrockTestDir, bedrockTestEnv);
    expect(test3).toContain("Terraform has been successfully initialized!");
  });
});
