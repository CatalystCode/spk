import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api";
import { IBuildApi } from "azure-devops-node-api/BuildApi";
import { RestClient } from "typed-rest-client";
import { Config } from "../../config";
import { logger } from "../../logger";

// File Variables
let connection: WebApi | undefined;
let restApi: RestClient | undefined;
let buildApi: IBuildApi | undefined;

/**
 * Creates AzDo `azure-devops-node-api.WebApi` with `orgUrl` and `token and returns `WebApi`
 *
 */
export const getWebApi = async (): Promise<WebApi> => {
  if (typeof connection !== "undefined") {
    return connection;
  }

  const config = Config();
  logger.debug(`Config: ${config}`);
  const gitOpsConfig = config.azure_devops!;
  const orgUrl = gitOpsConfig.org!;
  const personalAccessToken = gitOpsConfig.access_token!;

  // PAT and devops URL are required
  if (typeof personalAccessToken === "undefined") {
    throw Error(
      `Unable to parse Azure DevOps Personal Access Token (azure_devops.access_token) from spk config`
    );
  }

  if (typeof orgUrl === "undefined") {
    throw Error(
      `Unable to parse Azure DevOps Organization URL (azure_devops.org) from spk config`
    );
  }

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
