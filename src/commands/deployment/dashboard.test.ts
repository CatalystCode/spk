import * as path from "path";
import { exec } from "../../lib/shell";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import { validatePrereqs } from "../infra/vaildate";
import { config, loadConfiguration } from "./../init";
import { launchDashboard } from "./dashboard";

beforeAll(() => {
  process.env.test_name = "my_storage_account";
  process.env.test_key = "my_storage_key";
  const mockFileName = "src/commands/mocks/spk-config.yaml";
  const filename = path.resolve(mockFileName);
  loadConfiguration(filename);
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("Validate dashboard container pull", () => {
  test("Pull dashboard container if docker is installed", async () => {
    const dashboardLaunched = await launchDashboard(2020);
    const dockerInstalled = await validatePrereqs(["docker"], false);
    if (dockerInstalled) {
      const dockerId = await exec("docker", [
        "images",
        "-q",
        config.introspection!.dashboard!.image!
      ]);
      expect(dockerId).toBeDefined();
      expect(dashboardLaunched).toBeTruthy();
      logger.info("Verified that docker image has been pulled.");

      await exec("docker", [
        "container",
        "stop",
        config.introspection!.dashboard!.name!
      ]);
    } else {
      expect(dashboardLaunched).toBeFalsy();
    }
  }, 30000);
});
