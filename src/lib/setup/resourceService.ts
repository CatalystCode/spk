import { ResourceManagementClient } from "@azure/arm-resources";
import { loginWithServicePrincipalSecret } from "@azure/ms-rest-nodeauth";
import { logger } from "../../logger";
import {
  IRequestContext,
  RESOURCE_GROUP,
  RESOURCE_GROUP_LOCATION
} from "./constants";

let client: ResourceManagementClient;

export interface IResourceGroupItem {
  id: string;
  name: string;
  location: string;
}

const getClient = async (
  rc: IRequestContext
): Promise<ResourceManagementClient> => {
  if (client) {
    return client;
  }
  const creds = await loginWithServicePrincipalSecret(
    rc.servicePrincipalId!,
    rc.servicePrincipalPassword!,
    rc.servicePrincipalTenantId!
  );
  client = new ResourceManagementClient(creds, rc.subscriptionId!, {});
  return client;
};

/**
 * Returns a list of resource group for a subscription.
 *
 * @param rc Request Context
 */
export const getResourceGroups = async (
  rc: IRequestContext
): Promise<IResourceGroupItem[]> => {
  logger.info("attempting to get resource groups");
  await getClient(rc);
  const groups = await client.resourceGroups.list();
  logger.info("Successfully acquired resource groups");
  return groups.map(g => {
    return {
      id: g.id!,
      location: g.location!,
      name: g.name!
    };
  });
};

export const isExist = async (
  rc: IRequestContext,
  name: string
): Promise<boolean> => {
  const groups = await getResourceGroups(rc);
  return (groups || []).some(g => g.name === name);
};

/**
 * Creates resource group if it does not exists
 *
 * @param rc Request Context
 */
export const create = async (rc: IRequestContext): Promise<boolean> => {
  logger.info(`attempting to create resource group ${RESOURCE_GROUP}`);
  const exist = await isExist(rc, RESOURCE_GROUP);

  if (exist) {
    logger.info(`Resource group ${RESOURCE_GROUP} already existed`);
    rc.createdResourceGroup = false;
    return false;
  }
  await getClient(rc);
  await client.resourceGroups.createOrUpdate(RESOURCE_GROUP, {
    location: RESOURCE_GROUP_LOCATION
  });
  logger.info(`Successfully create resource group ${RESOURCE_GROUP}.`);
  rc.createdResourceGroup = true;
  return true;
};
