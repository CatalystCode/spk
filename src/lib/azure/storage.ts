import { logger } from "../../logger";
import { promisify } from "util";
import { exec } from "child_process";
import { getManagementCredentials } from "./azurecredentials";
import { azureSubscriptionId } from "../../../config";
import { StorageManagementClient } from "@azure/arm-storage";
import {
  StorageAccountsCheckNameAvailabilityResponse,
  StorageAccountsCreateResponse,
  SkuName,
  Kind,
  StorageAccountsListByResourceGroupResponse,
  StorageAccountsListKeysResponse
} from "@azure/arm-storage/esm/models";

/**
 * Creates  Azure storate account `name` in resource group `resourceGroup` in 1ocation `location`
 *
 * @param resourceGroup Name of Azure reesource group
 * @param name The Azure storage account name
 * @param location The Azure storage account location
 */
const getStorageClient = async (): Promise<StorageManagementClient> => {
  const creds = await getManagementCredentials();
  return new StorageManagementClient(creds, azureSubscriptionId);
};

/**
 * Creates Azure storate account `name` in resource group `resourceGroup` in 1ocation `location` if it is not exist
 *
 * @param resourceGroup Name of Azure reesource group
 * @param name The Azure storage account name
 * @param location The Azure storage account location
 */
export const createStorageAccountIfNotExists = async (
  resourceGroup: string,
  name: string,
  location: string
) => {
  const message = `Azure storage account ${name} in resource group ${resourceGroup}.`;
  try {
    logger.info(`Finding ${message}`);
    const client = await getStorageClient();
    const accounts: StorageAccountsListByResourceGroupResponse = await client.storageAccounts.listByResourceGroup(
      resourceGroup
    );
    let exists = false;

    logger.debug(
      `${accounts.length} storage accounts found in ${resourceGroup}`
    );
    for (let account of accounts) {
      logger.debug(`Found ${account.name} so far`);
      if (account.name === name) {
        exists = true;
        break;
      }
    }

    // Storage account exists so exit the method.
    if (exists) {
      logger.info(`Found ${message}`);
      return;
    }
    logger.info(`${message} does not exist`);
    // Storage account does not exist so create it.
    createStorageAccount(name, resourceGroup, location);
  } catch (err) {
    logger.error(err);
  }
};

/**
 * Creates Azure storate account `name` in resource group `resourceGroup` in 1ocation `location`
 *
 * @param name The Azure storage account name
 * @param resourceGroup Name of Azure reesource group
 * @param location The Azure storage account location
 */
export const createStorageAccount = async (
  name: string,
  resourceGroup: string,
  location: string
) => {
  const message = `Azure storage account ${name} in resource group ${resourceGroup} in ${location} location.`;
  try {
    const client = await getStorageClient();
    logger.verbose(
      `Checking for storage account name ${name} availability to create it`
    );
    const response: StorageAccountsCheckNameAvailabilityResponse = await client.storageAccounts.checkNameAvailability(
      name
    );
    if (response.nameAvailable == false) {
      logger.error(
        `Storage account ${name} is not available. Please choose different name.`
      );
      return;
    }

    logger.verbose(`Storage account name ${name} is availabile`);

    //Proceed to create a storage account
    const createParameters = {
      location: location,
      kind: <Kind>"Storage",
      sku: {
        name: <SkuName>"Standard_LRS"
      }
    };

    logger.info(`Creating ${message}`);
    const resp: StorageAccountsCreateResponse = await client.storageAccounts.create(
      resourceGroup,
      name,
      createParameters
    );
    logger.info(`Created ${message}`);
  } catch (err) {
    logger.error(`Error occurred while creating ${message}`);
    logger.error(err);
  }
};

/**
 * Get storage account `name` primary key in resource group `resourceGroup` nd returns the primary key `Promise<string>`
 *
 * @param name The Azure storage account name
 * @param resourceGroup Name of Azure reesource group
 */
export const getStorageAccountKey = async (
  name: string,
  resourceGroup: string
): Promise<string | undefined> => {
  const message = `Azure storage account ${name} in resource group ${resourceGroup} in ${location} location.`;
  try {
    const client = await getStorageClient();
    logger.verbose(`Reading storage account ${name} access keys`);

    const keyResults: StorageAccountsListKeysResponse = await client.storageAccounts.listKeys(
      resourceGroup,
      name
    );
    if (keyResults.keys == undefined) {
      logger.verbose(`Storage account ${name} access keys do not exist`);
      return undefined;
    }

    logger.verbose(
      `${keyResults.keys.length} Storage account access keys exist`
    );
    const key = keyResults.keys![0].value;
    logger.verbose(`key: ${key}`);
    return key;
  } catch (err) {
    logger.error(`Error occurred while getting the key ${message}`);
    logger.error(err);
  }
};

/**
 * Creates Azure resource group `name` in 1ocation `location` if not exist already
 *
 * @param name The Azure resource group name
 * @param location The Azure resource group location
 */
export const createResourceGroupIfNotExists = async (
  name: string,
  location: string
) => {
  const message = `Azure resource group ${name} in ${location} location`;
  try {
    logger.info(
      `Checking weather resource group ${name} exists in ${location} location.`
    );
    const response = await promisify(exec)(`az group exists -n ${name}`);
    if (response.stdout === "true") {
      logger.info(`${message} already exists.`);
    } else {
      logger.info(`Creating ${message}`);
      const stdout = await promisify(exec)(
        `az group create -n ${name} -l ${location}`
      );
      logger.info(`Created ${message}`);
    }
  } catch (err) {
    logger.error(`Error occurred while creating ${message}`);
    logger.error(err);
  }
};
