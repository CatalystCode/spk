import { ContainerRegistryManagementClient } from "@azure/arm-containerregistry";
import { loginWithServicePrincipalSecret } from "@azure/ms-rest-nodeauth";
import { logger } from "../../logger";
import {
  ACR,
  IRequestContext,
  RESOURCE_GROUP,
  RESOURCE_GROUP_LOCATION
} from "./constants";

let client: ContainerRegistryManagementClient;

export interface IRegistryItem {
  id: string;
  name: string;
  resourceGroup: string;
}

/**
 * Returns the container registry management client. It is cached once it is created.
 *
 * @param rc Request Context
 */
const getClient = async (
  rc: IRequestContext
): Promise<ContainerRegistryManagementClient> => {
  if (client) {
    return client;
  }
  // any is used because of a bug.
  // https://github.com/Azure/azure-sdk-for-js/issues/7763
  const creds: any = await loginWithServicePrincipalSecret(
    rc.servicePrincipalId!,
    rc.servicePrincipalPassword!,
    rc.servicePrincipalTenantId!
  );
  client = new ContainerRegistryManagementClient(creds, rc.subscriptionId!, {});
  return client;
};

/**
 * Returns a list of container registries based on the service principal credentials.
 *
 * @param rc Request Context
 */
export const getContainerRegistries = async (
  rc: IRequestContext
): Promise<IRegistryItem[]> => {
  logger.info("attempting to get Azure container registries");
  await getClient(rc);
  const registries = await client.registries.list();
  logger.info("Successfully acquired Azure container registries");
  return registries.map(r => {
    const id = r.id! as string;
    const match = id.match(/\/resourceGroups\/(.+?)\//);
    return {
      id,
      name: r.name!,
      resourceGroup: match ? match[1] : ""
    };
  });
};

/**
 * Returns true of container register exists
 *
 * @param rc Request Context
 * @param resourceGroup Resource group name
 * @param name Container registry name
 */
export const isExist = async (
  rc: IRequestContext,
  resourceGroup: string,
  name: string
): Promise<boolean> => {
  const registries = await getContainerRegistries(rc);
  return (registries || []).some(
    r => r.resourceGroup === resourceGroup && r.name === name
  );
};

/**
 * Creates a container registry
 *
 * @param rc Request Context
 */
export const create = async (rc: IRequestContext) => {
  logger.info(
    `attempting to create Azure container registry, ${ACR} in ${RESOURCE_GROUP}`
  );
  const exist = await isExist(rc, RESOURCE_GROUP, ACR);

  if (exist) {
    logger.info(
      `Azure container registry, ${ACR} in ${RESOURCE_GROUP} already existed`
    );
    rc.createdACR = false;
    return false;
  }
  await getClient(rc);
  await client.registries.create(RESOURCE_GROUP, ACR, {
    location: RESOURCE_GROUP_LOCATION,
    sku: { name: "Standard", tier: "Standard" }
  });
  logger.info(
    `Successfully create Azure container registry, ${ACR} in ${RESOURCE_GROUP}.`
  );
  rc.createdACR = true;
  return true;
};
