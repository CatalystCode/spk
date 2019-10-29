import { promisify } from "util";
import uuid from "uuid/v4";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import {
  createTestBedrockYaml,
  createTestMaintainersYaml
} from "../../test/mockFactory";
import { createService } from "./create";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("Creating a variable group in Azure DevOps project", () => {
  test("Should fail when required arguments are not specified", async () => {
    // Create random directory to initialize
  });
});
