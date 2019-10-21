import fs from "fs";
import os from "os";
import path from "path";
import shelljs from "shelljs";
import uuid from "uuid/v4";
import { execCommand } from "./command";

////////////////////////////////////////////////////////////////////////////////
// Setup
////////////////////////////////////////////////////////////////////////////////
beforeAll(() => {
  jest.setTimeout(10000); // increase timeout; these tests require loading ts-node
});
afterAll(() => {
  jest.setTimeout(5000); // restore to default timeout
});

////////////////////////////////////////////////////////////////////////////////
// Tests
////////////////////////////////////////////////////////////////////////////////

describe("project", () => {
  describe("init", () => {
    describe("standard repo", () => {
      test("creates all necessary files", async () => {
        const randomTmpDir = path.join(os.tmpdir(), uuid());
        shelljs.mkdir("-p", randomTmpDir);

        await execCommand(["project", "init"], { cwd: randomTmpDir });

        const createdFiles = fs.readdirSync(randomTmpDir);
        for (const file of [
          ".gitignore",
          "Dockerfile",
          "azure-pipelines.yaml",
          "bedrock.yaml",
          "maintainers.yaml",
          "spk.log"
        ]) {
          expect(createdFiles.includes(file)).toBe(true);
        }
      });
    });

    describe("mono repo", () => {
      test("creates all necessary files", async () => {
        const randomTmpDir = path.join(os.tmpdir(), uuid());
        const packagePaths = ["a", "b", "c"].map(serviceDir => {
          const packagePath = path.join(randomTmpDir, "packages", serviceDir);
          shelljs.mkdir("-p", packagePath);
          return packagePath;
        });

        await execCommand(["project", "init", "-m"], { cwd: randomTmpDir });

        // Test all root files are generated in the mono repo
        const rootFiles = fs.readdirSync(randomTmpDir);
        for (const file of [
          "bedrock.yaml",
          "maintainers.yaml",
          "packages",
          "spk.log"
        ]) {
          expect(rootFiles.includes(file)).toBe(true);
        }
        for (const file of ["Dockerfile", "azure-pipelines.yaml"]) {
          expect(rootFiles.includes(file)).toBe(false);
        }

        for (const packagePath of packagePaths) {
          const filesInService = fs.readdirSync(packagePath);
          for (const expectedFile of [
            ".gitignore",
            "Dockerfile",
            "azure-pipelines.yaml"
          ]) {
            expect(filesInService.includes(expectedFile)).toBe(true);
          }
        }
      });
    });
  });
});
