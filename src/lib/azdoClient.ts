import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api";
import { IBuildApi } from "azure-devops-node-api/BuildApi";
import { RestClient } from "typed-rest-client";
import { Config } from "../config";
import { logger } from "../logger";
// import { azdoUrl } from "./azdoutil";

// File Variables
let connection: WebApi | undefined;
let restApi: RestClient | undefined;
let buildApi: IBuildApi | undefined;

/**
 * Return a well-formed AzDo organization URL.
 * @param orgName Azure DevOps organization name.
 * @returns AzDo Url for the organization
 */
export const azdoUrl = (orgName: string): string =>
  `https://dev.azure.com/${orgName}`;

/**
 * Creates AzDo `azure-devops-node-api.WebApi` with `orgUrl` and `token and returns `WebApi`
 *
 */
export const getWebApi = async (): Promise<WebApi> => {
  if (typeof connection !== "undefined") {
    return connection;
  }

  const config = Config();
  const gitOpsConfig = config.azure_devops!;
  const orgName = gitOpsConfig.org!;
  const personalAccessToken = gitOpsConfig.access_token!;

  // PAT and devops URL are required
  if (typeof personalAccessToken === "undefined") {
    throw Error(
      `Unable to parse Azure DevOps Personal Access Token (azure_devops.access_token) from spk config`
    );
  }

  if (typeof orgName === "undefined") {
    throw Error(
      `Unable to parse Azure DevOps Organization name (azure_devops.org) from spk config`
    );
  }

  const orgUrl = azdoUrl(orgName);

  logger.debug(
    `getWebApi called with org url: ${orgUrl} and token: ${personalAccessToken}`
  );

  const authHandler = getPersonalAccessTokenHandler(personalAccessToken);
  connection = new WebApi(orgUrl, authHandler);

  return connection;
};

/**
 * Creates AzDo `azure-devops-node-api.WebApi.RestClient` with `orgUrl` and `token and returns `RestClient`
 *
 */
export const getRestClient = async (): Promise<RestClient> => {
  if (typeof restApi !== "undefined") {
    return restApi;
  }

  const webApi = await getWebApi();
  restApi = webApi.rest;
  return restApi;
};

export const getBuildApi = async (): Promise<IBuildApi> => {
  if (typeof buildApi !== "undefined") {
    return buildApi;
  }

  const webApi = await getWebApi();
  buildApi = await webApi.getBuildApi();
  return buildApi;
};
