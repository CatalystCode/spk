import { generateUuid } from "@azure/core-http";
import { IRestResponse, RestClient } from "typed-rest-client";
import { logger } from "../../logger";
import { IServiceConnectionConfiguration } from "../../types";
import { getRestClient } from "./azDo";

const apiUrl: string = "_apis/serviceendpoint/endpoints";
const apiVersion: string = "api-version=5.1-preview.2";

/**
 * Check for Azdo Service Connection by name `serviceConnectionConfig.name` and creates `serviceConnection` if it does not exist
 *
 * @param orgUrl The Azure DevOps organization
 * @param personalAccessToken The Azure DevOps persoanl access token to authenticate
 * @param project  The Azure DevOps project within the organization
 * @param serviceConnection The service connection configuration
 */
export const createServiceConnectionIfNotExists = async (
  orgUrl: string,
  personalAccessToken: string,
  project: string,
  serviceConnectionConfig: IServiceConnectionConfiguration
): Promise<string> => {
  const serviceConnectionName = serviceConnectionConfig.name;
  const message = `service connection ${serviceConnectionName}`;

  if (serviceConnectionName === null || serviceConnectionName === undefined) {
    throw new Error("Service Connection name is null");
  }

  try {
    let serviceConnection: any;

    // get service connection by name that is configured in the config file
    serviceConnection = await getServiceConnectionByName(
      orgUrl,
      personalAccessToken,
      project,
      serviceConnectionName
    );

    // Service connection is not found so create a new service connection
    if (serviceConnection === null || serviceConnection === undefined) {
      serviceConnection = await addServiceConnection(
        orgUrl!,
        personalAccessToken!,
        project!,
        serviceConnectionConfig!
      );
    }

    if (serviceConnection === null || serviceConnection === undefined) {
      throw new Error(
        "Unable to find a existing service connection by name or create a new service connection"
      );
    }

    logger.debug(`Service connection: ${JSON.stringify(serviceConnection)}`);
    logger.info(`Service connection id: ${serviceConnection.id}`);

    return serviceConnection.id;
  } catch (err) {
    logger.error(`Error occurred while checking and creating ${message}`);
    logger.error(err);
    throw err;
  }
};

/**
 * Creates new Azdo Service Connection
 *
 * @param orgUrl The Azure DevOps organization
 * @param personalAccessToken The Azure DevOps persoanl access token to authenticate
 * @param project  The Azure DevOps project within the organization
 * @param serviceConnection The service connection configuration
 */
export const addServiceConnection = async (
  orgUrl: string,
  personalAccessToken: string,
  project: string,
  serviceConnectionConfig: IServiceConnectionConfiguration
): Promise<string> => {
  logger.info(`service connection called`);

  let resp: IRestResponse<any>;

  try {
    // get service endpoint json data for post request
    const endPointDataJson: JSON = await createServiceEndPointData(
      serviceConnectionConfig
    );

    const client: RestClient = await getRestClient(orgUrl, personalAccessToken);
    const resource: string = `${orgUrl}/${project}/${apiUrl}?${apiVersion}`;
    logger.info(`Resource: ${resource}`);

    resp = await client.create(resource, endPointDataJson);

    if (resp === null || resp.statusCode !== 200) {
      const errMessage = "Creating Service Connection failed.";
      logger.error(`${errMessage}`);
      throw new Error(`${errMessage}`);
    }

    logger.debug(`Service Connection: ${JSON.stringify(resp.result)}`);
    logger.info(`Created Service Connection with id: ${resp.result.id}`);
    logger.debug(
      `Service Endpoint Response: status code: ${resp.statusCode}; results: ${resp.result}`
    );
  } catch (err) {
    logger.error(err);
    throw err;
  }
  return resp.result;
};

export const getServiceConnectionByName = async (
  orgUrl: string,
  personalAccessToken: string,
  project: string,
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
    logger.info(`Resource: ${resource}`);

    resp = await client.get(resource);

    // check for response conditions
    if (resp !== null && resp.statusCode === 200 && resp.result !== null) {
      logger.debug(
        `Service Endpoint Response: status code: ${
          resp.statusCode
        }; results: ${JSON.stringify(resp.result)}`
      );
    }

    if (resp.result.value !== null && resp.result.value.length > 0) {
      logger.debug(
        `Found Service Connection by name: ${serviceConnectionName} and the id is ${resp.result.value[0].id}`
      );
    }

    // expect to find one service by name, otherwise throw an error
    if (resp.result.count > 1) {
      const errMessage = `Found ${resp.result.count} service connections by name ${serviceConnectionName}`;
      logger.debug(errMessage);
      throw new Error(errMessage);
    }
    return resp.result.value === null ? null : resp.result.value[0];
  } catch (err) {
    throw err;
  }
};

const createServiceEndPointData = async (
  serviceConnectionConfig: IServiceConnectionConfiguration
): Promise<JSON> => {
  const endPointData: any = {
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

  return endPointData as JSON;
};
