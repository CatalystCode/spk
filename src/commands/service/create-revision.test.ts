import os from "os";
import path from "path";
import shell from "shelljs";
import uuid from "uuid/v4";
import { write } from "../../config";
import * as gitutils from "../../lib/gitutils";
import * as azure from "../../lib/git/azure";
import { IBedrockFile } from "../../types";
import {
  getDefaultRings,
  getSourceBranch,
  makePullRequest
} from "./create-revision";
import { logger } from "@azure/keyvault-secrets";

jest
  .spyOn(gitutils, "getCurrentBranch")
  .mockReturnValueOnce(Promise.resolve("prod"))
  .mockReturnValue(Promise.resolve(""));
const prSpy = jest
  .spyOn(azure, "createPullRequest")
  .mockReturnValue(Promise.resolve("done"));

describe("Default rings", () => {
  test("Get multiple default rings", () => {
    const randomTmpDir = path.join(os.tmpdir(), uuid());
    shell.mkdir("-p", randomTmpDir);
    const validBedrockYaml: IBedrockFile = {
      rings: {
        master: { isDefault: true },
        prod: { isDefault: false },
        westus: { isDefault: true }
      },
      services: {
        "foo/a": {
          helm: {
            // Missing 'chart'
            chart: {
              repository: "some-repo"
            }
          }
        }
      }
    } as any;

    write(validBedrockYaml, randomTmpDir);
    const defaultRings = getDefaultRings(undefined, validBedrockYaml);
    expect(defaultRings.length).toBe(2);
    expect(defaultRings[0]).toBe("master");
    expect(defaultRings[1]).toBe("westus");
  });

  test("No default rings", () => {
    const randomTmpDir = path.join(os.tmpdir(), uuid());
    shell.mkdir("-p", randomTmpDir);
    const validBedrockYaml: IBedrockFile = {
      rings: {
        master: { isDefault: false },
        prod: { isDefault: false },
        westus: { isDefault: false }
      },
      services: {
        "foo/a": {
          helm: {
            // Missing 'chart'
            chart: {
              repository: "some-repo"
            }
          }
        }
      }
    } as any;

    write(validBedrockYaml, randomTmpDir);
    let hasError = false;

    try {
      getDefaultRings(undefined, validBedrockYaml);
    } catch (err) {
      hasError = true;
    }
    expect(hasError).toBe(true);
  });
});

describe("Source branch", () => {
  test("Defined source branch", async () => {
    const branch = "master";
    const sourceBranch = await getSourceBranch(branch);
    expect(sourceBranch).toBe("master");
  });
  test("Defined source branch", async () => {
    const branch = undefined;
    const sourceBranch = await getSourceBranch(branch);
    expect(sourceBranch).toBe("prod");
  });
  test("No source branch", async () => {
    const branch = undefined;
    let hasError = false;
    try {
      await getSourceBranch(branch);
    } catch (err) {
      hasError = true;
    }
    expect(hasError).toBe(true);
  });
});

describe("Create pull request", () => {
  test("Valid parameters", async () => {
    await makePullRequest(
      ["master"],
      "testTitle",
      "testBranch",
      "testDescription",
      "testOrg",
      "testUrl",
      "testToken"
    );
    expect(prSpy).toHaveBeenCalled();
  });
});
