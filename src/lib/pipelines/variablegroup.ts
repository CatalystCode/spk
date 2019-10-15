import { DefinitionResourceReference } from "azure-devops-node-api/interfaces/BuildInterfaces";
import {
  VariableGroup,
  VariableValue
} from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import {
  AzureKeyVaultVariableGroupProviderData,
  AzureKeyVaultVariableValue,
  VariableGroupParameters
} from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import { config } from "../../commands/init";
import { logger } from "../../logger";
import { getTaskAgentClient } from "./azDo";
import { getBuildApiClient } from "./pipelines";
import { createServiceConnectionIfNotExists } from "./serviceConnection";

/**
 * Creates  Azure storate account `name` in resource group `resourceGroup` in 1ocation `location`
 *
 * @param resourceGroup Name of Azure reesource group
 * @param name The Azure storage account name
 * @param location The Azure storage account location
 */
export const addVariableGroup = async (): Promise<VariableGroup> => {
  const groupConfig = config.azure_devops!.variable_group!;
  const message: string = `Variable Group ${groupConfig.name}`;
  try {
    logger.info(`Creating ${message}`);

    if (groupConfig.variables === undefined || groupConfig.variables === null) {
      throw new Error("Invalid input. Variable are not configured");
    }

    const variablesMap: { [key: string]: VariableValue } = {};
    const variables = JSON.stringify(groupConfig.variables!);

    logger.info(`variable: ${variables}`);

    for (const [key, value] of Object.entries(groupConfig.variables!)) {
      logger.debug(`variable: ${key}: value: ${JSON.stringify(value)}`);
      variablesMap[key] = value;
    }

    // creating variable group parameterts
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
 * Creates  Azure storate account `name` in resource group `resourceGroup` in 1ocation `location`
 *
 * @param resourceGroup Name of Azure reesource group
 * @param name The Azure storage account name
 * @param location The Azure storage account location
 */
export const addVariableGroupWithKeyVaultMap = async (): Promise<
  VariableGroup
> => {
  const gitOpsConfig = config.azure_devops!;
  const orgUrl = gitOpsConfig.orgUrl;
  const token = gitOpsConfig.access_token;
  const project = gitOpsConfig.project;
  const groupConfig = gitOpsConfig.variable_group!;
  const groupKvConfig = groupConfig.key_vault_provider!;

  const message: string = `Variable Group ${groupConfig.name}`;

  try {
    logger.info(`Creating ${message}`);
    let serviceConnectionId: string | null = null;
    if (
      groupConfig.key_vault_provider === undefined ||
      groupConfig.key_vault_provider === null
    ) {
      throw new Error(
        "Invalid input. Azure KeyVault Provider data is not configured"
      );
    }

    // When variable group is configured with key vault provier, handle service connection
    logger.info(`Checking for Service connection`);
    serviceConnectionId = await createServiceConnectionIfNotExists(
      orgUrl,
      token,
      project,
      groupKvConfig.service_connection
    );

    logger.info(
      `Using Service connection id: ${serviceConnectionId!} for Key Vault`
    );

    // AzureKeyVaultVariableValue
    const kvProvideData: AzureKeyVaultVariableGroupProviderData = {
      serviceEndpointId: serviceConnectionId!,
      vault: groupConfig.key_vault_provider!.name
    };

    const secretsMap: { [key: string]: AzureKeyVaultVariableValue } = {};

    for (const secret of groupConfig.key_vault_provider!.secrets) {
      secretsMap[secret] = {
        enabled: true,
        isSecret: true
      };
    }

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

const doAddVariableGroup = async (
  variableGroupdata: VariableGroupParameters,
  accessToAllPipelines: boolean
): Promise<VariableGroup> => {
  const gitOpsConfig = config.azure_devops!;
  const orgUrl = gitOpsConfig.orgUrl;
  const token = gitOpsConfig.access_token;
  const project = gitOpsConfig.project;

  const message: string = `Variable Group ${variableGroupdata.name}`;

  try {
    logger.debug(
      `Creating new Variable Group ${JSON.stringify(variableGroupdata)}`
    );
    const taskClient: ITaskAgentApi = await getTaskAgentClient(orgUrl, token);
    const group: VariableGroup = await taskClient.addVariableGroup(
      variableGroupdata,
      project
    );
    logger.debug(`Created new Variable Group. Id: ${JSON.stringify(group)}`);
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

const authorizeAccessToAllPipelines = async (
  variableGroup: VariableGroup
): Promise<boolean> => {
  const gitOpsConfig = config.azure_devops!;
  const orgUrl = gitOpsConfig.orgUrl;
  const token = gitOpsConfig.access_token;
  const project = gitOpsConfig.project;
  const message: string = `Resource definition to access all pipelines for Variable Group ${variableGroup.name}`;

  try {
    // authorize access to variable group from all pipelines
    logger.info(`Creating ${message}`);

    const resourceDefinition: DefinitionResourceReference = {
      authorized: true,
      id: variableGroup.id!.toString(),
      name: variableGroup.name,
      type: "variablegroup"
    };

    logger.debug(
      `Creating resource definition: ${JSON.stringify(resourceDefinition)}`
    );

    const buildCleint = await getBuildApiClient(orgUrl!, token!);
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
      `Authorized access to Variable Group id: ${variableGroup.id} from all pipelines with a resource definition authorized set to ${resourceDefinitionResponse[0].authorized}`
    );

    return true;
  } catch (err) {
    logger.error(`Failed to create ${message}`);
    logger.error(err);
    throw err;
  }
};
