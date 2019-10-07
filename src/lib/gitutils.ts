import GitUrlParse from "git-url-parse";
import { logger } from "../logger";
import { exec } from "./shell";

/**
 * Gets the current working branch.
 */
export const getCurrentBranch = async () => {
  try {
    const branch = await exec("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
    return branch;
  } catch (_) {
    logger.warn("Unable to determine current branch.");
    return "";
  }
};

/**
 * Checkout the given branch.
 *
 * @param branchName
 */
export const checkoutBranch = async (branchName: string) => {
  try {
    await exec("git", ["checkout", `${branchName}`]);
  } catch (_) {
    logger.warn(`unable to checkout git branch ${branchName}.`);
  }
};

/**
 * Create and checkout a new branch.
 *
 * @param branchName
 */
export const checkoutNewBranch = async (branchName: string) => {
  try {
    await exec("git", ["checkout", "-b", `${branchName}`]);
  } catch (_) {
    logger.warn(`unable to create and checkout new git branch ${branchName}.`);
  }
};

/**
 * Delete local branch.
 *
 * @param branchName
 */
export const deleteBranch = async (branchName: string) => {
  try {
    await exec("git", ["branch", "-D", `${branchName}`]);
  } catch (_) {
    logger.warn(`unable to delete git branch ${branchName}.`);
  }
};

/**
 * Adds the directory and commits changes for a new service.
 *
 * @param directory
 * @param branchName
 */
export const commitDir = async (directory: string, branchName: string) => {
  try {
    await exec("git", ["add", `${directory}`]);
    await exec("git", ["commit", "-m", `Adding new service: ${branchName}`]);
  } catch (_) {
    logger.warn(`unable to push git branch ${branchName}.`);
  }
};

/**
 * Pushes branch to origin.
 *
 * @param branchName
 */
export const pushBranch = async (branchName: string) => {
  try {
    await exec("git", ["push", "-u", "origin", `${branchName}`]);
  } catch (_) {
    logger.warn(`unable to push git branch ${branchName}.`);
  }
};

/**
 * Gets the origin url.
 */
export const getOriginUrl = async () => {
  try {
    const originUrl = await exec("git", [
      "config",
      "--get",
      "remote.origin.url"
    ]);
    logger.debug(`Got git origin url ${originUrl}`);
    return originUrl;
  } catch (_) {
    logger.warn(`unable to git origin URL.`);
  }
  return "";
};

/**
 * Will create a link to create a PR for a given origin, base branch, and new branch.
 * Currently only AzDo and Github are supported.
 *
 * @param baseBranch
 * @param newBranch
 * @param originUrl
 */
export const getPullRequestLink = async (
  baseBranch: string,
  newBranch: string,
  originUrl: string
) => {
  const gitComponents = GitUrlParse(originUrl);

  if (gitComponents.resource.includes("dev.azure.com")) {
    logger.debug("azure devops repo found.");
    return `https://dev.azure.com/${gitComponents.organization}/${gitComponents.owner}/_git/${gitComponents.name}/pullrequestcreate?sourceRef=${newBranch}&targetRef=${baseBranch}`;
  } else if (gitComponents.resource === "github.com") {
    logger.debug("github repo found.");
    return `https://github.com/${gitComponents.organization}/${gitComponents.name}/compare/${baseBranch}...${newBranch}?expand=1`;
  } else {
    logger.warn(
      "Could not determine origin repository, or it is not a supported type."
    );
    return "Could not determine origin repository. Please check for the newly pushed branch and open a PR manually.";
  }
};
