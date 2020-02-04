import fs from "fs";
import * as os from "os";
import path from "path";
import simpleGit from "simple-git/promise";
import { safeGitUrlForLogging } from "../../lib/gitutils";
import { logger } from "../../logger";

export const spkTemplatesPath = path.join(os.homedir(), ".spk/templates");
const git = simpleGit();

export const repoCloneRegex = async (source: string): Promise<string> => {
  const httpReg = /^(.*?)\.com/;
  const punctuationReg = /[^\w\s]/g;
  const sourceFolder = source
    .replace(httpReg, "")
    .replace(punctuationReg, "_")
    .toLowerCase();
  return sourceFolder;
};

/**
 * Clones a remote repository to local spk cache
 * given a sourcePath to clone into and source remote url
 *
 */
export const repoClone = async (
  sourcePath: string,
  source: string
): Promise<void> => {
  const safeLoggingUrl = safeGitUrlForLogging(source!);
  try {
    // Check if .git folder exists in ${sourcePath}, if not, then clone
    // if already cloned, 'git pull'
    if (fs.existsSync(path.join(sourcePath, ".git"))) {
      // Make sure we have the latest version of all releases cached locally
      await simpleGit(sourcePath).fetch("all");
      await simpleGit(sourcePath).pull("origin", "master");
      logger.info(`${safeLoggingUrl} already cloned. Performing 'git pull'...`);
    } else {
      await git.clone(source, `${sourcePath}`);
      logger.info(`Cloning source repo to .spk/templates was successful.`);
    }
  } catch (err) {
    throw err;
  }
};
