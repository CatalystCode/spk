import Deployment from "spektate/lib/Deployment";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import { Helper, OUTPUT_FORMAT } from "./helper";

// tslint:disable-next-line: no-var-requires
const data = require("./mocks/data.json");
const fakeDeployments = data.data;
jest.spyOn(Helper, "getDeployments").mockImplementation(
  (outputFormat: any): Promise<Deployment[]> => {
    return new Promise<Deployment[]>(resolve => {
      resolve(fakeDeployments as Deployment[]);
      return fakeDeployments;
    });
  }
);

beforeAll(() => {
  jest.mock("./helper");
  enableVerboseLogging();
});

afterAll(() => {
  jest.unmock("./helper");
  disableVerboseLogging();
});

describe("Get deployments", () => {
  test("get a basic deployment", async () => {
    logger.info("Getting deployments");
    const deployments = await Helper.getDeployments(OUTPUT_FORMAT.WIDE);
    expect(deployments).not.toBeUndefined();
    if (deployments) {
      expect(deployments.length).not.toBeUndefined();
      logger.info("Got " + deployments.length + " deployments");
      expect(deployments).toHaveLength(27);
    }
  });
});
