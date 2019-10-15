import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import { RestClient } from "typed-rest-client";
import { logger } from "../../logger";

export const getWebApi = async (
  orgUrl: string,
  token: string
): Promise<WebApi> => {
  logger.debug(
    `getRestClient called with org url: ${orgUrl} and token: ${token}`
  );
  const authHandler = getPersonalAccessTokenHandler(token);
  const api = new WebApi(orgUrl, authHandler);
  return api;
};

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

export const getTaskAgentClient = async (
  orgUrl: string,
  token: string
): Promise<ITaskAgentApi> => {
  logger.debug(
    `getRestClient called with org url: ${orgUrl} and token: ${token}`
  );
  const connection = await getWebApi(orgUrl, token);
  return await connection.getTaskAgentApi();
};
