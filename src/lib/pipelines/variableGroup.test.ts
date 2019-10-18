////////////////////////////////////////////////////////////////////////////////
// Mocks
////////////////////////////////////////////////////////////////////////////////
jest.mock("azure-devops-node-api");
jest.mock("../../config");
jest.mock("./azdo");

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////
import uuid from "uuid/v4";
import { Config } from "../../config";
import { disableVerboseLogging, enableVerboseLogging } from "../../logger";
import { TaskApi } from "./variableGroup";

////////////////////////////////////////////////////////////////////////////////
// Tests
////////////////////////////////////////////////////////////////////////////////
beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("TaskApi", () => {
  test("should fail when PAT not set", async () => {
    (Config as jest.Mock).mockReturnValue({
      azure_devops: {}
    });

    let invalidPatError: Error | undefined;
    try {
      await TaskApi();
    } catch (err) {
      invalidPatError = err;
    }
    expect(invalidPatError).toBeDefined();
  });
});
