import { generateUuid } from "@azure/core-http";
import { IRestResponse, RestClient } from "typed-rest-client";
import { getConfig } from "../../../src/config";
import { logger } from "../../logger";
import { IServiceConnectionConfiguration } from "../../types";
import { getRestClient } from "./azDo";
import {
  IServiceEndPoint,
  IServiceEndPointParams
} from "./serviceConnectionInterfaces";

const apiUrl: string = "_apis/serviceendpoint/endpoints";
const apiVersion: string = "api-version=5.1-preview.2";

const config = getConfig();
logger.debug(`Config: ${JSON.stringify(config)}`);
const gitOpsConfig = config.azure_devops!;
const orgUrl = gitOpsConfig.orgUrl;
const personalAccessToken = gitOpsConfig.access_token;
const project = gitOpsConfig.project!;

/**
 * Check for Azdo Service Connection by name `serviceConnectionConfig.name` and creates `serviceConnection` if it does not exist
 *
 * @param serviceConnection The service connection configuration
 */
export const createServiceConnectionIfNotExists = async (
  serviceConnectionConfig: IServiceConnectionConfiguration
): Promise<string> => {
  const serviceConnectionName = serviceConnectionConfig.name;
  const message = `service connection ${serviceConnectionName}`;

  if (serviceConnectionName === null || serviceConnectionName === undefined) {
    throw new Error("Invalid inout. Service Connection name is null");
  }

  try {
    let serviceConnection: any;

    // get service connection by name that is configured in the config file
    serviceConnection = await getServiceConnectionByName(serviceConnectionName);

    // Service connection is not found so create a new service connection
    if (serviceConnection === null || serviceConnection === undefined) {
      serviceConnection = await addServiceConnection(serviceConnectionConfig!);
    }

    if (serviceConnection === null || serviceConnection === undefined) {
      throw new Error(
        "Either unable to find a existing service connection by name or create a new service connection"
      );
    }

    return serviceConnection.id;
  } catch (err) {
    logger.error(`Error occurred while checking and creating ${message}`);
    logger.error(err);
    throw err;
  }
};

/**
 * Creates a new Service Connection in Azure DevOps project
 *
 * @param serviceConnection The service connection configuration
 */
export const addServiceConnection = async (
  serviceConnectionConfig: IServiceConnectionConfiguration
): Promise<IServiceEndPoint> => {
  const message = `service connection ${serviceConnectionConfig.name}`;
  logger.info(`addServiceConnection method called with ${message}`);

  let resp: IRestResponse<IServiceEndPoint>;

  try {
    const endPointParams: IServiceEndPointParams = await createServiceEndPointParams(
      serviceConnectionConfig
    );

    logger.debug(
      `Creating Service Endpoint with: ${JSON.stringify(endPointParams)}`
    );
    logger.info(`Creating ${message}`);

    const client: RestClient = await getRestClient(orgUrl, personalAccessToken);
    const resource: string = `${orgUrl}/${project}/${apiUrl}?${apiVersion}`;
    logger.debug(` addServiceConnection:Resource: ${resource}`);

    resp = await client.create(resource, endPointParams);

    if (resp === null || resp.statusCode !== 200 || resp.result === null) {
      const errMessage = "Creating Service Connection failed.";
      logger.error(`${errMessage}`);
      throw new Error(`${errMessage}`);
    }

    logger.debug(
      `Service Endpoint Response status code: status code: ${resp.statusCode}}`
    );
    logger.debug(
      `Service Endpoint Response results: ${JSON.stringify(resp.result)}`
    );
    logger.info(`Created Service Connection with id: ${resp.result!.id}`);

    return resp.result!;
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

/**
 * Get Service Connection by name from Azure DevOps project
 *
 * @param serviceConnectionName The service connection name to find existing service connection by name
 */
export const getServiceConnectionByName = async (
  serviceConnectionName: string
): Promise<string | null> => {
  logger.info(
    `getServiceConnectionByName called with ${serviceConnectionName}`
  );

  let resp: IRestResponse<any>;

  try {
    const uriParameter = `?endpointNames=${serviceConnectionName}`;
    const client: RestClient = await getRestClient(orgUrl, personalAccessToken);
    const resource: string = `${orgUrl}/${project}/${apiUrl}${uriParameter}&${apiVersion}`;
    logger.info(`getServiceConnectionByName:Resource: ${resource}`);

    resp = await client.get(resource);

    logger.debug(
      `getServiceConnectionByName: Service Endpoint Response results: ${JSON.stringify(
        resp.result
      )}`
    );

    // check for response conditions
    if (resp === null || resp.result === null || resp.result.count === 0) {
      logger.info(
        `NO Service Connection was found by name: ${serviceConnectionName}`
      );
      return null;
    }

    if (resp.result.count > 1) {
      const errMessage = `Found ${resp.result.count} service connections by name ${serviceConnectionName}`;
      throw new Error(errMessage);
    }

    logger.info(
      `Found Service Connection by name ${serviceConnectionName} with a id ${resp.result.value[0].id}`
    );

    return resp.result.count === 0 ? null : resp.result.value[0];
  } catch (err) {
    throw err;
  }
};

export const createServiceEndPointParams = async (
  serviceConnectionConfig: IServiceConnectionConfiguration
): Promise<IServiceEndPointParams> => {
  const endPointParams: IServiceEndPointParams = {
    authorization: {
      parameters: {
        authenticationType: "spnKey",
        serviceprincipalid: serviceConnectionConfig.service_principal_id,
        serviceprincipalkey: serviceConnectionConfig.service_principal_secret,
        tenantid: serviceConnectionConfig.tenant_id
      },
      scheme: "ServicePrincipal"
    },
    data: {
      subscriptionId: serviceConnectionConfig.subscription_id,
      subscriptionName: serviceConnectionConfig.subscription_name
    },
    id: generateUuid(),
    isReady: false,
    name: serviceConnectionConfig.name,
    type: "azurerm"
  };

  return endPointParams;
};
