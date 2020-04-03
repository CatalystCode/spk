import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger,
} from "../../logger";
import { execute } from "./get-display-name";
import * as fs from "fs";
import { createTestBedrockYaml } from "../../test/mockFactory";
import { BedrockFile } from "../../types";
import * as bedrockYaml from "../../lib/bedrockYaml";

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("get display name", () => {
  it("positive test", async () => {
    const exitFn = jest.fn();
    execute({}, exitFn);
    expect(exitFn).toBeCalledTimes(1);
    const defaultBedrockFileObject = createTestBedrockYaml(
      false
    ) as BedrockFile;
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(bedrockYaml, "read").mockReturnValue(defaultBedrockFileObject);
    jest.spyOn(process, "cwd").mockReturnValue("bedrock.yaml/");
    execute({}, exitFn);
    expect(exitFn).toBeCalledTimes(2);
  });
});
