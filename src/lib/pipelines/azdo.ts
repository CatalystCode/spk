import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import { RestClient } from "typed-rest-client";
import { logger } from "../../logger";

/**
 * Creates AzDo `azure-devops-node-api.WebApi` with `orgUrl` and `token and returns `WebApi`
 *
 * @param orgUrl The Azure DevOps Org url
 * @param token The personal access token from Azure DevOps project
 */
export const getWebApi = async (
  orgUrl: string,
  token: string
): Promise<WebApi> => {
  logger.debug(`getWebApi called with org url: ${orgUrl} and token: ${token}`);
  const authHandler = getPersonalAccessTokenHandler(token);
  return new WebApi(orgUrl, authHandler);
};

/**
 * Creates AzDo `azure-devops-node-api.WebApi.RestClient` with `orgUrl` and `token and returns `RestClient`
 *
 * @param orgUrl The Azure DevOps Org url
 * @param token The personal access token from Azure DevOps project
 */
export const getRestClient = async (
  orgUrl: string,
  token: string
): Promise<RestClient> => {
  logger.debug(
    `getRestClient called with org url: ${orgUrl} and token: ${token}`
  );
  const connection = await getWebApi(orgUrl, token);
  return connection.rest;
};

/**
 * Creates AzDo `azure-devops-node-api.WebApi.ITaskAgentApi` with `orgUrl` and `token and returns `ITaskAgentApi`
 *
 * @param orgUrl The Azure DevOps Org url
 * @param token The personal access token from Azure DevOps project
 */
export const getTaskAgentClient = async (
  orgUrl: string,
  token: string
): Promise<ITaskAgentApi> => {
  logger.debug(
    `getTaskAgentClient called with org url: ${orgUrl} and token: ${token}`
  );
  const connection = await getWebApi(orgUrl, token);
  return await connection.getTaskAgentApi();
};
