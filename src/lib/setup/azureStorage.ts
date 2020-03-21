import {
  RequestContext,
  RESOURCE_GROUP,
  STORAGE_ACCOUNT_NAME,
  RESOURCE_GROUP_LOCATION
} from "./constants";
import {
  createStorageAccount as createAccount,
  isStorageAccountExist
} from "../azure/storage";
import * as promptBuilder from "../promptBuilder";
import inquirer from "inquirer";

export const createStorageAccount = async (
  name: string
): Promise<boolean | undefined> => {
  const oStorage = await isStorageAccountExist(RESOURCE_GROUP, name, {});
  if (!oStorage) {
    try {
      await createAccount(RESOURCE_GROUP, name, RESOURCE_GROUP_LOCATION);
      return true;
    } catch (e) {
      return undefined;
    }
  } else {
    return false;
  }
};

export const createStorage = async (rc: RequestContext): Promise<void> => {
  rc.storageAccountName = rc.storageAccountName || STORAGE_ACCOUNT_NAME;
  let res = await createStorageAccount(rc.storageAccountName);
  while (res === undefined) {
    const ans = await inquirer.prompt([
      promptBuilder.azureStorageAccountName()
    ]);
    rc.storageAccountName = ans.azdo_storage_account_name as string;
    res = await createStorageAccount(rc.storageAccountName);
  }
  rc.createdStorageAccount = !!res;
};
