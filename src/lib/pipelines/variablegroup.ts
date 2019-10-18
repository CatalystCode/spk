import { DefinitionResourceReference } from "azure-devops-node-api/interfaces/BuildInterfaces";
import {
  AzureKeyVaultVariableGroupProviderData,
  AzureKeyVaultVariableValue,
  VariableGroup,
  VariableGroupParameters,
  VariableValue
} from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import { Config } from "../../config";
import { logger } from "../../logger";
import { getBuildApi, getWebApi } from "../azdoClient";
import { IServiceEndpoint } from "./azdoInterfaces";
import { createServiceEndpointIfNotExists } from "./serviceEndpoint";

let taskApi: ITaskAgentApi | undefined; // keep track of the gitApi so it can be reused

/**
 * Creates AzDo `azure-devops-node-api.WebApi.ITaskAgentApi` with `orgUrl` and `token and returns `ITaskAgentApi`
 *
 */
export const TaskApi = async (): Promise<ITaskAgentApi> => {
  if (typeof taskApi !== "undefined") {
    return taskApi;
  }

  const api = await getWebApi();
  taskApi = await api.getTaskAgentApi();
  return taskApi;
};

/**
 * Adds Variable group `groupConfig` in Azure DevOps project and returns `VariableGroup` object
 *
 */
export const addVariableGroup = async (): Promise<VariableGroup> => {
  const config = Config();
  const groupConfig = config.azure_devops!.variable_group!;
  const message: string = `Variable Group ${groupConfig.name}`;
  try {
    logger.info(`Creating ${message}`);

    if (
      typeof groupConfig.variables === undefined ||
      typeof groupConfig.variables === null
    ) {
      throw new Error("Invalid input. Variable are not configured");
    }

    // map variables from configuration
    const variablesMap = await buildVariablesMap(groupConfig.variables!);

    // create variable group parameterts
    const params: VariableGroupParameters = {
      description: groupConfig.description,
      name: groupConfig.name,
      type: "Vsts",
      variables: variablesMap
    };

    return doAddVariableGroup(params, true);
  } catch (err) {
    logger.error(`Failed to create ${message}`);
    logger.error(err);
    throw err;
  }
};

/**
 * * Adds Variable group `groupConfig` with Key Valut maopping in Azure DevOps project and returns `VariableGroup` object
 *
 */
export const addVariableGroupWithKeyVaultMap = async (): Promise<
  VariableGroup
> => {
  const gitOpsConfig = Config().azure_devops!;
  const project = gitOpsConfig.project!;
  const groupConfig = gitOpsConfig.variable_group!;
  const groupKvConfig = groupConfig.key_vault_provider!;

  const message: string = `Variable Group ${groupConfig.name}`;

  try {
    logger.info(`Creating ${message}`);
    let serviceEndpoint: IServiceEndpoint;
    if (
      typeof groupConfig.key_vault_provider === undefined ||
      typeof groupConfig.key_vault_provider === null
    ) {
      throw new Error(
        "Invalid input. Azure KeyVault Provider data is not configured"
      );
    }

    // get service endpoint id
    logger.info(`Checking for Service endpoint`);
    serviceEndpoint = await createServiceEndpointIfNotExists(
      groupKvConfig.service_endpoint
    );

    logger.info(
      `Using Service endpoint id: ${serviceEndpoint.id} for Key Vault`
    );

    // create AzureKeyVaultVariableValue object
    const kvProvideData: AzureKeyVaultVariableGroupProviderData = {
      serviceEndpointId: serviceEndpoint.id,
      vault: groupConfig.key_vault_provider!.name
    };

    // map secrets from config
    const secretsMap: IKeyVaultVariableMap = await buildKeyVaultVariablesMap(
      groupConfig.key_vault_provider!.secrets
    );

    // creating variable group parameterts
    const params: VariableGroupParameters = {
      description: groupConfig.description,
      name: groupConfig.name,
      providerData: kvProvideData,
      type: "AzureKeyVault",
      variables: secretsMap
    };

    return doAddVariableGroup(params, true);
  } catch (err) {
    logger.error(`Failed to create ${message}`);
    logger.error(err);
    throw err;
  }
};

/**
 * * Adds Variable group with `VariableGroupParameters` data and returns `VariableGroup` object.
 *
 * @param variableGroupdata The Variable group data
 * @param accessToAllPipelines Whether the variable group should be accessible by all pipelines
 */
const doAddVariableGroup = async (
  variableGroupdata: VariableGroupParameters,
  accessToAllPipelines: boolean
): Promise<VariableGroup> => {
  const message: string = `Variable Group ${variableGroupdata.name}`;
  const gitOpsConfig = Config().azure_devops!;
  const project = gitOpsConfig.project!;
  try {
    logger.debug(
      `Creating new Variable Group ${JSON.stringify(variableGroupdata)}`
    );
    const taskClient: ITaskAgentApi = await TaskApi();
    const group: VariableGroup = await taskClient.addVariableGroup(
      variableGroupdata,
      project
    );
    logger.debug(`Created new Variable Group: ${JSON.stringify(group)}`);
    logger.info(`Created ${message} with id: ${group.id!}`);

    if (accessToAllPipelines) {
      await authorizeAccessToAllPipelines(group);
    }

    return group;
  } catch (err) {
    logger.error(`Failed to create ${message}`);
    logger.error(err);
    throw err;
  }
};

/**
 * * Enables authorization for all pipelines to access Variable group with `variableGroup` data and returns `true` if successful
 *
 * @param variableGroup The Variable group object
 */
const authorizeAccessToAllPipelines = async (
  variableGroup: VariableGroup
): Promise<boolean> => {
  const message: string = `Resource definition for all pipelines to access Variable Group ${variableGroup.name}`;

  try {
    // authorize access to variable group from all pipelines
    logger.info(`Creating ${message}`);
    const gitOpsConfig = Config().azure_devops!;
    const project = gitOpsConfig.project!;

    const resourceDefinition: DefinitionResourceReference = {
      authorized: true,
      id: variableGroup.id!.toString(),
      name: variableGroup.name,
      type: "variablegroup"
    };

    logger.debug(
      `Creating resource definition: ${JSON.stringify(resourceDefinition)}`
    );

    const buildCleint = await getBuildApi();
    const resourceDefinitionResponse = await buildCleint.authorizeProjectResources(
      [resourceDefinition],
      project
    );

    logger.debug(
      `Created resource definition: ${JSON.stringify(
        resourceDefinitionResponse
      )}`
    );
    logger.info(
      `Authorized access ${message} authorized flag set to ${resourceDefinitionResponse[0].authorized}`
    );

    return true;
  } catch (err) {
    logger.error(`Failed to create ${message}`);
    logger.error(err);
    throw err;
  }
};

export interface IVariablesMap {
  [key: string]: VariableValue;
}

export interface IKeyVaultVariableMap {
  [key: string]: AzureKeyVaultVariableValue;
}

export const buildKeyVaultVariablesMap = async (
  secrets: string[]
): Promise<IKeyVaultVariableMap> => {
  const secretsMap: IKeyVaultVariableMap = {};
  logger.debug(`secrets: ${secrets}`);

  for (const secret of secrets) {
    logger.debug(`secret name: ${secret}`);
    secretsMap[secret] = {
      enabled: true,
      isSecret: true
    };
  }

  logger.debug(`secretsMap: ${JSON.stringify(secretsMap)}`);
  return secretsMap;
};

export const buildVariablesMap = async (
  variables: IVariablesMap[]
): Promise<IVariablesMap> => {
  const variablesMap: IVariablesMap = {};
  logger.debug(`variables: ${JSON.stringify(variables)}`);

  for (const [key, value] of Object.entries(variables)) {
    logger.debug(`variable: ${key}: value: ${JSON.stringify(value)}`);
    variablesMap[key] = value;
  }

  logger.debug(`variablesMap: ${JSON.stringify(variablesMap)}`);
  return variablesMap;
};
