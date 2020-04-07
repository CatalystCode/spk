import { disableVerboseLogging, enableVerboseLogging } from "../../logger";
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
    execute({ path: "test" }, exitFn);
    expect(exitFn).toBeCalledTimes(1);
    execute({ path: undefined }, exitFn);
    expect(exitFn).toBeCalledTimes(2);
    const defaultBedrockFileObject = createTestBedrockYaml(
      false
    ) as BedrockFile;
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(bedrockYaml, "read").mockReturnValue(defaultBedrockFileObject);
    jest.spyOn(process, "cwd").mockReturnValue("bedrock.yaml/");
    const consoleSpy = jest.spyOn(console, "log");
    execute({ path: "./packages/service1" }, exitFn);
    expect(consoleSpy).toHaveBeenCalledWith("service1");
    expect(exitFn).toBeCalledTimes(3);
  });
});
