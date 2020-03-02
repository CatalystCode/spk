import fs from "fs";
import { IRequestContext, SETUP_LOG } from "./constants";

const getBooleanVal = (val: boolean | undefined) => {
  return !!val ? "yes" : "no";
};

export const create = (rc: IRequestContext | undefined, file?: string) => {
  if (rc) {
    file = file || SETUP_LOG;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
    const buff = [
      `organization name: ${rc.orgName}`,
      `project name: ${rc.projectName}`,
      "access token': *********",
      `workspace: ${rc.workspace}`,
      `Project Created: ${getBooleanVal(rc.createdProject)}`,
      `High Level Definition Repo Scaffolded: ${getBooleanVal(rc.scaffoldHLD)}`,
      `Manifest Repo Scaffolded: ${getBooleanVal(rc.scaffoldManifest)}`
    ];
    if (rc.error) {
      buff.push(`Error: ${rc.error}`);
      buff.push("Status: Incomplete");
    } else {
      buff.push("Status: Completed");
    }

    fs.writeFileSync(file, buff.join("\n"));
  }
};
