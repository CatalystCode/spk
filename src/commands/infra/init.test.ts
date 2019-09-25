import child_process from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import shell from "shelljs";
import uuid from "uuid/v4";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import { validatePrereqs } from "./init";
import { validateAzure } from "./init";
import { validateEnvVariables } from "./init";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("Validating executable prerequisites", () => {
  test("Validate that array of executables do not exists in PATH", async () => {
    // Iterate through an array of non-existent binaries to create a force fail. If fails, then test pass
    let fakeBinaries: string[] = ["ydawgie"];
    validatePrereqs(fakeBinaries).then((value: boolean) => {
      expect(value).toBeFalsy();
    });
  });
});

describe("Validating Azure authentication", () => {
  test("Validate that a logged out user produces a force fail", async () => {
    // Produce an error that requires user to login
    child_process.exec("az logout");
    validateAzure().then((value: boolean) => {
      expect(value).toBeFalsy();
    });
  });
});

describe("Validating environment variables", () => {
  test("Test whether environment variables are set and not null", async () => {
    // Set environment variables to null, and create a force fail scenario
    let variables: string[] = ["ydawgie"];
    process.env["ydawgie"] = "";
    validateEnvVariables(variables).then((value: boolean) => {
      expect(value).toBeFalsy();
    });
  });
});
