import fs from "fs";
import path from "path";
import uuid from "uuid/v4";
import { createTempDir } from "../ioUtil";
import { create } from "./setupLog";

describe("test create function", () => {
  it("positive test: no request context", () => {
    const dir = createTempDir();
    const file = path.join(dir, uuid());

    create(undefined, file);

    expect(fs.existsSync(file)).toBeFalsy();
  });
  it("positive test: no errors", () => {
    const dir = createTempDir();
    const file = path.join(dir, uuid());

    create(
      {
        accessToken: "accessToken",
        createdProject: true,
        orgName: "orgName",
        projectName: "projectName",
        scaffoldHLD: true,
        scaffoldManifest: true,
        workspace: "workspace"
      },
      file
    );

    expect(fs.existsSync(file)).toBeTruthy();
  });
  it("positive test: no errors and log already exists", () => {
    const dir = createTempDir();
    const file = path.join(dir, uuid());
    fs.writeFileSync(file, "dummy");

    create(
      {
        accessToken: "accessToken",
        createdProject: true,
        orgName: "orgName",
        projectName: "projectName",
        scaffoldHLD: true,
        scaffoldManifest: true,
        workspace: "workspace"
      },
      file
    );

    expect(fs.existsSync(file)).toBeTruthy();
  });
  it("positive test: with errors", () => {
    const dir = createTempDir();
    const file = path.join(dir, uuid());

    create(
      {
        accessToken: "accessToken",
        createdProject: true,
        error: "things broke",
        orgName: "orgName",
        projectName: "projectName",
        scaffoldHLD: true,
        scaffoldManifest: true,
        workspace: "workspace"
      },
      file
    );

    expect(fs.existsSync(file)).toBeTruthy();
  });
});
