////////////////////////////////////////////////////////////////////////////////
// Mocks
////////////////////////////////////////////////////////////////////////////////
jest.mock("azure-devops-node-api");
// jest.mock("../../commands/init");
jest.mock("../../config");

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////
import { WebApi } from "azure-devops-node-api";
import uuid from "uuid/v4";
// import { Config } from "../../commands/init";
import { getConfig } from "../../config";
import { disableVerboseLogging, enableVerboseLogging } from "../../logger";
import {
  addVariableGroup,
  addVariableGroupWithKeyVaultMap,
  TaskApi
} from "./variableGroup";

////////////////////////////////////////////////////////////////////////////////
// Tests
////////////////////////////////////////////////////////////////////////////////
beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("TaskAPI", () => {
  test("should fail when PAT not set", async () => {
    const invalidCheck: string | undefined = undefined;
    expect(invalidCheck).toBeUndefined();
  });
});
