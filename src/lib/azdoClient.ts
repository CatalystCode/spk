// imports
import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api";
import { IBuildApi } from "azure-devops-node-api/BuildApi";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import { RestClient } from "typed-rest-client";
import { Config } from "../config";
import { logger } from "../logger";
import { AzureDevOpsOpts } from "./git";
import { GitAPI } from "./git/azure";
import { build as buildError } from "./errorBuilder";
import { errorStatusCode } from "./errorStatusCode";

// Module state Variables
let connection: WebApi | undefined;
let restApi: RestClient | undefined;
let buildApi: IBuildApi | undefined;
let taskAgentApi: ITaskAgentApi | undefined;

/**
 * Return a well-formed AzDo organization URL.
 * @param orgName Azure DevOps organization name.
 * @returns fully qualified AzDo Url for the organization
 */
export const azdoUrl = (orgName: string): string =>
  `https://dev.azure.com/${orgName}`;

/**
 * Creates AzDo `azure-devops-node-api.WebApi` with `org` and `token`
 * @param opts optionally override spk config Azure DevOps access options
 * @returns AzDo `WebApi` object
 */
export const getWebApi = async (
  opts: AzureDevOpsOpts = {}
): Promise<WebApi> => {
  if (connection) {
    return connection;
  }

  // Load config from opts and fallback to spk config
  const config = Config();
  const {
    personalAccessToken = config.azure_devops?.access_token,
    orgName = config.azure_devops?.org,
  } = opts;

  // PAT and devops URL are required
  if (!personalAccessToken) {
    throw buildError(
      errorStatusCode.AZURE_CLIENT,
      "azure-client-get-web-api-err-missing-access-token"
    );
  }

  if (!orgName) {
    throw buildError(
      errorStatusCode.AZURE_CLIENT,
      "azure-client-get-web-api-err-missing-org"
    );
  }

  const orgUrl = azdoUrl(orgName);

  logger.debug(
    `getWebApi with org url: ${orgUrl} and token: ${personalAccessToken}`
  );

  const authHandler = getPersonalAccessTokenHandler(personalAccessToken);
  connection = new WebApi(orgUrl, authHandler);
  return connection;
};

export const invalidateWebApi = (): void => {
  connection = undefined;
};

/**
 * Creates AzDo `azure-devops-node-api.WebApi.RestClient` with `org` and `token and returns `RestClient`
 * @param opts optionally override spk config Azure DevOps access options
 * @returns AzDo `RestClient` object
 */
export const getRestClient = async (
  opts: AzureDevOpsOpts = {}
): Promise<RestClient> => {
  if (restApi) {
    return restApi;
  }

  try {
    const webApi = await getWebApi(opts);
    restApi = webApi.rest;
    return restApi;
  } catch (err) {
    throw buildError(
      errorStatusCode.AZURE_CLIENT,
      "azure-client-get-rest-client-err",
      err
    );
  }
};

/**
 * Creates AzDo `azure-devops-node-api.WebApi.IBuildApi` with `org` and `token and returns `RestClient`
 * @param opts optionally override spk config Azure DevOps access options
 * @returns AzDo `IBuildApi` object
 */
export const getBuildApi = async (
  opts: AzureDevOpsOpts = {}
): Promise<IBuildApi> => {
  if (buildApi) {
    return buildApi;
  }

  try {
    const webApi = await getWebApi(opts);
    buildApi = await webApi.getBuildApi();
    return buildApi;
  } catch (err) {
    throw buildError(
      errorStatusCode.AZURE_CLIENT,
      "azure-client-get-build-client-err",
      err
    );
  }
};

/**
 * Get Azure DevOps Task API client
 *
 * @param opts for organization name and personal access token value
 * @returns AzDo `IBuildApi` object
 */
export const getTaskAgentApi = async (
  opts: AzureDevOpsOpts = {}
): Promise<ITaskAgentApi> => {
  if (taskAgentApi) {
    return taskAgentApi;
  }

  try {
    const webApi = await getWebApi(opts);
    taskAgentApi = await webApi.getTaskAgentApi();
    return taskAgentApi;
  } catch (err) {
    throw buildError(
      errorStatusCode.AZURE_CLIENT,
      "azure-client-get-task-agent-client-err",
      err
    );
  }
};

/**
 * Checks if the repository has a given file.
 * @param fileName The name of the file
 * @param branch The branch name
 * @param repoName The name of the repository
 * @accessOpts The Azure DevOps access options to the repository
 */
export const repositoryHasFile = async (
  fileName: string,
  branch: string,
  repoName: string,
  accessOpts: AzureDevOpsOpts
): Promise<void> => {
  const gitApi = await GitAPI(accessOpts);
  const versionDescriptor = { version: branch }; // change to branch
  const gitItem = await gitApi.getItem(
    repoName,
    fileName, // Add path to service
    accessOpts.project,
    "",
    undefined,
    undefined,
    undefined,
    undefined,
    versionDescriptor
  );

  if (gitItem === null) {
    throw Error(
      "Error installing build pipeline. Repository does not have a " +
        fileName +
        " file."
    );
  }
};

/**
 * Validates if a repository exists and if it contains the given file
 * @param project  The Azure DevOps project name
 * @param fileName The name of the file
 * @param branch The branch name
 * @param repoName The name of the repository
 * @param accessOpts The Azure DevOps access options to the repository
 */
export const validateRepository = async (
  project: string,
  fileName: string,
  branch: string,
  repoName: string,
  accessOpts: AzureDevOpsOpts
): Promise<void> => {
  const gitApi = await GitAPI(accessOpts);
  const repo = await gitApi.getRepository(repoName, project);

  if (!repo) {
    throw Error(
      `Project '${project}' does not contain repository '${repoName}'.`
    );
  }

  await repositoryHasFile(fileName, branch, repoName, accessOpts);
};
