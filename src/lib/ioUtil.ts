import fs from "fs";
import os from "os";
import path from "path";
import uuid from "uuid/v4";

/**
 * Creates a random directory in tmp directory.
 *
 * @param parent Parent directory. Directory will be created
 *        in os temp dir if this value is not provided
 * @return full path of the new directory.
 */
export const createTempDir = (parent?: string): string => {
  parent = parent || os.tmpdir();

  const randomTmpDir = path.join(parent, uuid());
  fs.mkdirSync(randomTmpDir);
  return randomTmpDir;
};

/**
 * Removes directory, including all sub directory and files
 * @param dir Directory name
 */
export const removeDir = (dir: string) => {
  fs.readdirSync(dir).forEach(item => {
    const curPath = path.join(dir, item);
    if (fs.statSync(curPath).isDirectory()) {
      removeDir(curPath);
    } else {
      fs.unlinkSync(curPath);
    }
  });
  fs.rmdirSync(dir);
};
