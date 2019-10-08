import child_process from "child_process";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import {
  validateAzure,
  validateEnvVariables,
  validatePrereqs
} from "./vaildate";

beforeAll(() => {
  enableVerboseLogging();
  jest.setTimeout(30000);
});

afterAll(() => {
  disableVerboseLogging();
  jest.setTimeout(5000);
});

describe("Validating executable prerequisites", () => {
  test("Validate that array of executables do not exists in PATH", async () => {
    // Iterate through an array of non-existent binaries to create a force fail. If fails, then test pass
    const fakeBinaries: string[] = ["ydawgie"];
    const value = await validatePrereqs(fakeBinaries, false);
    expect(value).toBe(false);
  });
});

describe("Validating Azure authentication", () => {
  test("Validate that a logged out user produces a force fail", async () => {
    // Produce an error that requires user to login
    child_process.exec("az logout");
    const value = await validateAzure(false);
    expect(value).toBe(false);
  });
});

describe("Validating environment variables", () => {
  test("Test whether environment variables are set and not null", async () => {
    // Set environment variables to null, and create a force fail scenario
    const variables: string[] = ["ydawgie"];
    process.env.ydawgie = "";
    const value = await validateEnvVariables(variables, false);
    expect(value).toBe(false);
  });
});
