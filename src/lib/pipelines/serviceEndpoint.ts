import { generateUuid } from "@azure/core-http";
import { IRestResponse, RestClient } from "typed-rest-client";
import { Config } from "../../config";
import { logger } from "../../logger";
import { IServiceEndpointConfiguration } from "../../types";
import { azdoUrl, getRestClient } from "../azdoClient";
import { IServiceEndpoint, IServiceEndpointParams } from "./azdoInterfaces";

const apiUrl: string = "_apis/serviceendpoint/endpoints";
const apiVersion: string = "api-version=5.1-preview.2";

/**
 * Check for Azdo Service Endpoint by name `serviceEndpointConfig.name` and creates `serviceEndpoint` if it does not exist
 *
 * @param serviceEndpoint The service endpoint configuration
 * @returns newly created `IServiceEndpoint` object
 */
export const createServiceEndpointIfNotExists = async (
  serviceEndpointConfig: IServiceEndpointConfiguration
): Promise<IServiceEndpoint> => {
  const serviceEndpointName = serviceEndpointConfig.name;
  const message = `service endpoint ${serviceEndpointName}`;

  if (serviceEndpointName === null || serviceEndpointName === undefined) {
    throw new Error("Invalid inout. Service Endpoint name is null");
  }

  try {
    let serviceEndpoint: IServiceEndpoint | null;

    // get service endpoint by name that is configured in the config file
    serviceEndpoint = await getServiceEndpointByName(serviceEndpointName);

    // Service endpoint is not found so create a new service endpoint
    if (serviceEndpoint === null || serviceEndpoint === undefined) {
      serviceEndpoint = await addServiceEndpoint(serviceEndpointConfig!);
    }

    if (serviceEndpoint === null || serviceEndpoint === undefined) {
      throw new Error(
        "Either unable to find a existing service endpoint by name or create a new service endpoint"
      );
    }

    return serviceEndpoint;
  } catch (err) {
    logger.error(`Error occurred while checking and creating ${message}`);
    logger.error(err);
    throw err;
  }
};

/**
 * Creates a new Service Endpoint in Azure DevOps project
 *
 * @param serviceEndpoint The service endpoint configuration
 * @returns newly created `IServiceEndpoint` object
 */
export const addServiceEndpoint = async (
  serviceEndpointConfig: IServiceEndpointConfiguration
): Promise<IServiceEndpoint> => {
  const message = `service endpoint ${serviceEndpointConfig.name}`;
  logger.info(`addServiceEndpoint method called with ${message}`);

  let resp: IRestResponse<IServiceEndpoint>;

  const config = Config();
  const gitOpsConfig = config.azure_devops!;
  const orgUrl = azdoUrl(gitOpsConfig.org!);
  const project = gitOpsConfig.project!;

  try {
    const endPointParams: IServiceEndpointParams = await createServiceEndPointParams(
      serviceEndpointConfig
    );

    logger.debug(
      `Creating Service Endpoint with: ${JSON.stringify(endPointParams)}`
    );
    logger.info(`Creating ${message}`);

    const client: RestClient = await getRestClient();
    const resource: string = `${orgUrl}/${project}/${apiUrl}?${apiVersion}`;
    logger.debug(` addServiceEndpoint:Resource: ${resource}`);

    resp = await client.create(resource, endPointParams);

    if (resp === null || resp.statusCode !== 200 || resp.result === null) {
      const errMessage = "Creating Service Endpoint failed.";
      logger.error(`${errMessage}`);
      throw new Error(`${errMessage}`);
    }

    logger.debug(
      `Service Endpoint Response status code: status code: ${resp.statusCode}}`
    );
    logger.debug(
      `Service Endpoint Response results: ${JSON.stringify(resp.result)}`
    );
    logger.info(`Created Service Endpoint with id: ${resp.result!.id}`);

    return resp.result!;
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

/**
 * Get Service Endpoint by name from Azure DevOps project
 *
 * @param serviceEndpointName The service endpoint name to find existing service endpoint by name
 * * @returns `IServiceEndpoint` if found by the name; otherwise `null`
 */
export const getServiceEndpointByName = async (
  serviceEndpointName: string
): Promise<IServiceEndpoint | null> => {
  logger.info(`getServiceEndpointByName called with ${serviceEndpointName}`);

  let resp: IRestResponse<any>;
  const config = Config();
  const gitOpsConfig = config.azure_devops!;
  const orgUrl = azdoUrl(gitOpsConfig.org!);
  const project = gitOpsConfig.project!;

  try {
    const uriParameter = `?endpointNames=${serviceEndpointName}`;
    const client: RestClient = await getRestClient();
    const resource: string = `${orgUrl}/${project}/${apiUrl}${uriParameter}&${apiVersion}`;
    logger.info(`getServiceEndpointByName:Resource: ${resource}`);

    resp = await client.get(resource);

    logger.debug(
      `getServiceEndpointByName: Service Endpoint Response results: ${JSON.stringify(
        resp.result
      )}`
    );

    // check for response conditions
    if (resp === null || resp.result === null || resp.result.count === 0) {
      logger.info(
        `Service Endpoint was not found by name: ${serviceEndpointName}`
      );
      return null;
    }

    if (resp.result.count > 1) {
      const errMessage = `Found ${resp.result.count} service endpoints by name ${serviceEndpointName}`;
      throw new Error(errMessage);
    }

    const endpoints = resp.result.value as IServiceEndpoint[];
    logger.info(
      `Found Service Endpoint by name ${serviceEndpointName} with a id ${endpoints[0].id}`
    );

    return resp.result.count === 0 ? null : endpoints[0];
  } catch (err) {
    throw err;
  }
};

/**
 * Created `IServiceEndPointParams` from the argument `serviceEndpointConfig` received
 *
 * @param serviceEndpointConfig The service endpoint endpoint request data from configuration
 * @returns `IServiceEndpointParams` object
 */
export const createServiceEndPointParams = async (
  serviceEndpointConfig: IServiceEndpointConfiguration
): Promise<IServiceEndpointParams> => {
  await validateServiceEndpointInput(serviceEndpointConfig);
  const endPointParams: IServiceEndpointParams = {
    authorization: {
      parameters: {
        authenticationType: "spnKey",
        serviceprincipalid: serviceEndpointConfig.service_principal_id,
        serviceprincipalkey: serviceEndpointConfig.service_principal_secret,
        tenantid: serviceEndpointConfig.tenant_id
      },
      scheme: "ServicePrincipal"
    },
    data: {
      subscriptionId: serviceEndpointConfig.subscription_id,
      subscriptionName: serviceEndpointConfig.subscription_name
    },
    id: generateUuid(),
    isReady: false,
    name: serviceEndpointConfig.name,
    type: "azurerm"
  };

  return endPointParams;
};

/**
 * Check for `null` or `undefined` variables in `IServiceEndpointConfiguration`
 *
 * @param serviceEndpointConfig The service endpoint request data from configuration
 * @throws `Error` object when validation fails
 */
const validateServiceEndpointInput = async (
  serviceEndpointConfig: IServiceEndpointConfiguration
) => {
  const errors: string[] = [];

  // name is required
  if (typeof serviceEndpointConfig.name === "undefined") {
    errors.push(`Invalid Service end point name.`);
  }

  if (typeof serviceEndpointConfig.service_principal_id === "undefined") {
    errors.push(`Invalid service prrincipla id.`);
  }

  if (typeof serviceEndpointConfig.service_principal_secret === "undefined") {
    errors.push(`Invalid service prrincipla secret.`);
  }

  if (typeof serviceEndpointConfig.subscription_id === "undefined") {
    errors.push(`Invalid subscription id.`);
  }

  if (typeof serviceEndpointConfig.subscription_name === "undefined") {
    errors.push(`Invalid subscription name.`);
  }

  if (typeof serviceEndpointConfig.tenant_id === "undefined") {
    errors.push(`Invalid tenant id.`);
  }

  if (errors.length !== 0) {
    throw new Error(errors.join(""));
  }
};
