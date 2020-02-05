import path from "path";
import Deployment from "spektate/lib/Deployment";
import { loadConfiguration } from "../../config";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import {
  execute,
  getDeployments,
  getStatus,
  ICommandOptions,
  IInitObject,
  initialize,
  IValidatedOptions,
  OUTPUT_FORMAT,
  printDeployments,
  processOutputFormat,
  validateValues,
  watchGetDeployments
} from "./get";
import * as get from "./get";

const MOCKED_INPUT_VALUES: ICommandOptions = {
  buildId: "",
  commitId: "",
  deploymentId: "",
  env: "",
  imageTag: "",
  output: "",
  service: "",
  top: "",
  watch: false
};

const MOCKED_VALUES: IValidatedOptions = {
  buildId: "",
  commitId: "",
  deploymentId: "",
  env: "",
  imageTag: "",
  nTop: 0,
  output: "",
  outputFormat: OUTPUT_FORMAT.NORMAL,
  service: "",
  top: "",
  watch: false
};

const getMockedInputValues = (): ICommandOptions => {
  return JSON.parse(JSON.stringify(MOCKED_INPUT_VALUES));
};

const getMockedValues = (): IValidatedOptions => {
  return JSON.parse(JSON.stringify(MOCKED_VALUES));
};

// tslint:disable-next-line: no-var-requires
const data = require("./mocks/data.json");
const fakeDeployments = data;

jest.spyOn(get, "getDeployments").mockImplementation(
  (outputFormat: any): Promise<Deployment[]> => {
    return new Promise<Deployment[]>(resolve => {
      const mockedDeps: Deployment[] = [];
      fakeDeployments.data.forEach((dep: any) => {
        mockedDeps.push(
          new Deployment(
            dep.deploymentId,
            dep.commitId,
            dep.hldCommitId,
            dep.imageTag,
            dep.timeStamp,
            dep.environment,
            dep.service,
            dep.manifestCommitId,
            dep.srcToDockerBuild,
            dep.dockerToHldRelease,
            dep.hldToManifestBuild
          )
        );
      });
      resolve(mockedDeps as Deployment[]);
      return mockedDeps;
    });
  }
);

let initObject: IInitObject;

beforeAll(async () => {
  enableVerboseLogging();

  const mockFileName = "src/commands/mocks/spk-config.yaml";
  const filename = path.resolve(mockFileName);
  process.env.test_name = "my_storage_account";
  process.env.test_key = "my_storage_key";
  loadConfiguration(filename);
  initObject = await initialize();
});

afterAll(() => {
  disableVerboseLogging();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Test getStatus function", () => {
  it("with succeeded as value", () => {
    expect(getStatus("succeeded")).toBe("\u2713");
  });
  it("with empty string as value", () => {
    expect(getStatus("")).toBe("...");
  });
  it("with other string as value", () => {
    expect(getStatus("test")).toBe("\u0445");
  });
});

describe("Test processOutputFormat function", () => {
  it("with empty string as value", () => {
    expect(processOutputFormat("")).toBe(OUTPUT_FORMAT.NORMAL);
  });
  it("with normal string as value", () => {
    expect(processOutputFormat("normal")).toBe(OUTPUT_FORMAT.NORMAL);
  });
  it("with wide string as value", () => {
    expect(processOutputFormat("wide")).toBe(OUTPUT_FORMAT.WIDE);
  });
  it("with json string as value", () => {
    expect(processOutputFormat("json")).toBe(OUTPUT_FORMAT.JSON);
  });
});

describe("Test validateValues function", () => {
  it("positive test: valid values", () => {
    const vals = validateValues(MOCKED_INPUT_VALUES);
    expect(vals.nTop).toBe(0);
    expect(vals.outputFormat).toBe(OUTPUT_FORMAT.NORMAL);
  });
  it("positive test: valid values with output format as JSON", () => {
    const mockedValues = getMockedInputValues();
    mockedValues.output = "json";
    const vals = validateValues(mockedValues);
    expect(vals.nTop).toBe(0);
    expect(vals.outputFormat).toBe(OUTPUT_FORMAT.JSON);
  });
  it("positive test: valid values with output format as wiDE", () => {
    const mockedValues = getMockedInputValues();
    mockedValues.output = "wiDE";
    const vals = validateValues(mockedValues);
    expect(vals.nTop).toBe(0);
    expect(vals.outputFormat).toBe(OUTPUT_FORMAT.WIDE);
  });
  it("positive test: valid values with top = 5", () => {
    const mockedValues = getMockedValues();
    mockedValues.top = "5";
    const vals = validateValues(mockedValues);
    expect(vals.nTop).toBe(5);
    expect(vals.outputFormat).toBe(OUTPUT_FORMAT.NORMAL);
  });
  it("negative test: valid values with top = -5", () => {
    const mockedValues = getMockedValues();
    mockedValues.top = "-5";
    try {
      validateValues(mockedValues);
    } catch (e) {
      expect(e.message).toBe(
        "value for top option has to be a positive number"
      );
    }
  });
});

describe("Test execute function", () => {
  it("positive test", async () => {
    jest
      .spyOn(get, "initialize")
      .mockReturnValueOnce(Promise.resolve(initObject));
    jest.spyOn(get, "getDeployments").mockReturnValueOnce(Promise.resolve([]));
    const exitFn = jest.fn();
    await execute(getMockedInputValues(), exitFn);
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[0]]);
  });
  it("positive test with watch", async () => {
    jest
      .spyOn(get, "initialize")
      .mockReturnValueOnce(Promise.resolve(initObject));
    jest.spyOn(get, "watchGetDeployments").mockReturnValueOnce();
    const exitFn = jest.fn();

    const mockedVals = getMockedInputValues();
    mockedVals.watch = true;
    await execute(mockedVals, exitFn);
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[0]]);
  });
  it("negative test", async () => {
    jest.spyOn(get, "initialize").mockReturnValueOnce(Promise.reject("Error"));
    const exitFn = jest.fn();

    await execute(getMockedInputValues(), exitFn);
    expect(exitFn).toBeCalledTimes(1);
    expect(exitFn.mock.calls).toEqual([[1]]);
  });
});

describe("Test printDeployments function", () => {
  it("without deployments", () => {
    expect(printDeployments([], OUTPUT_FORMAT.NORMAL)).not.toBeDefined();
  });
});

describe("Get deployments", () => {
  test("get some basic deployments", async () => {
    const values = getMockedValues();
    values.outputFormat = OUTPUT_FORMAT.WIDE;
    const deployments = await getDeployments(initObject, values);
    expect(deployments).not.toBeUndefined();
    expect(deployments.length).not.toBeUndefined();
    logger.info("Got " + deployments.length + " deployments");
    expect(deployments).toHaveLength(10);
  });
});

describe("Watch get deployments", () => {
  test("watch get deployments", async () => {
    jest.useFakeTimers();
    const values = getMockedValues();
    values.outputFormat = OUTPUT_FORMAT.WIDE;

    watchGetDeployments(initObject, values);
    expect(getDeployments).toBeCalled();
    jest.advanceTimersByTime(6000);
    expect(getDeployments).toBeCalledTimes(2);

    jest.clearAllTimers();
  });
});

describe("Introspect deployments", () => {
  test("verify basic fields are defined", async () => {
    const deployments = await getDeployments(initObject, getMockedValues());
    deployments.forEach((deployment: Deployment) => {
      const dep = deployment as Deployment;

      // Make sure the basic fields are defined
      expect(dep.deploymentId).not.toBe("");
      expect(dep.service).not.toBe("");
      expect(dep.duration()).not.toBe("");
      expect(dep.status()).not.toBe("");
      expect(dep.environment).not.toBe("");
      expect(dep.timeStamp).not.toBe("");

      // Make sure at least one of the builds/releases exist
      expect(
        dep.srcToDockerBuild != null ||
          dep.dockerToHldRelease != null ||
          dep.hldToManifestBuild != null
      ).toBeTruthy();
    });
  });
});

describe("Print deployments", () => {
  test("verify print deployments", async () => {
    const deployments = await getDeployments(initObject, getMockedValues());
    let table = printDeployments(deployments, processOutputFormat("json"));
    expect(table).not.toBeUndefined();
    const deployment = [
      "",
      "hello-bedrock",
      "7468ca0a24e1",
      "c626394",
      6046,
      "hello-bedrock-master-6046",
      "✓",
      180,
      "DEV",
      "706685f",
      "✓",
      6047,
      "✓"
    ];
    table!.forEach((field, index, array) => {
      if (field[2] === deployment[2]) {
        for (let i = 1; i < field.length; i++) {
          expect(field[i]).toEqual(deployment[i]);
        }
        expect(field).toHaveLength(13);
      }
    });

    table = printDeployments(deployments, processOutputFormat("json"), 3);
    expect(table).toHaveLength(3);
  });
});

describe("Output formats", () => {
  test("verify wide output", async () => {
    const deployments = await getDeployments(initObject, getMockedValues());
    const table = printDeployments(deployments, processOutputFormat("wide"));
    expect(table).not.toBeUndefined();
    table!.forEach((field, index, array) => {
      expect(field).toHaveLength(17);
    });
  });
});
