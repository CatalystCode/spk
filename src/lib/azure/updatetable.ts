import * as azure from "azure-storage";
import uuid from "uuid/v4";
import { logger } from "../../logger";

/**
 * Updates a deployment entry in the storage table
 * @param accountName Name of the storage account
 * @param accountKey Access key for the storage account
 * @param tableName Name of the table in storage account to use
 * @param partitionKey Partition key for the project
 * @param filterName Name of the field to filter by, for eg. imageTag is a filter name for the image tag release pipeline
 * @param filterValue Value of the filter key
 * @param key1 Name of the first field being inserted to the table
 * @param value1 Value of the first field being inserted to the table
 * @param key2 Name of the second field being inserted to the table
 * @param value2 Value of the second field being inserted to the table
 * @param key3 Name of the third field being inserted to the table
 * @param value3 Value of the third field being inserted to the table
 */
export const updateDeployment = (
  accountName: string,
  accountKey: string,
  tableName: string,
  partitionKey: string,
  filterName: string,
  filterValue: string,
  key1: string,
  value1: string,
  key2?: string,
  value2?: string,
  key3?: string,
  value3?: string
) => {
  const tableService = azure.createTableService(accountName, accountKey);
  const query: azure.TableQuery = new azure.TableQuery().where(
    "PartitionKey eq '" + partitionKey + "'"
  );
  query.and(filterName + " eq '" + filterValue + "'");

  // To get around issue https://github.com/Azure/azure-storage-node/issues/545, set below to null
  const nextContinuationToken: azure.TableService.TableContinuationToken = null as any;

  tableService.queryEntities(
    tableName,
    query,
    nextContinuationToken,
    (error, result) => {
      if (!error) {
        updateExistingDeployment(
          result.entries,
          accountName,
          accountKey,
          tableName,
          partitionKey,
          filterName,
          filterValue,
          key1,
          value1,
          key2,
          value2,
          key3,
          value3
        );
      } else {
        logger.error(error.message);
      }
    }
  );
};

/**
 * Adds a deployment entry to the storage table
 * @param accountName Name of the storage account
 * @param accountKey Access key for the storage account
 * @param tableName Name of the table in storage account to use
 * @param partitionKey Partition key for the project
 * @param filterName Name of the field to filter by, for eg. imageTag is a filter name for the image tag release pipeline
 * @param filterValue Value of the filter key
 * @param key1 Name of the first field being inserted to the table
 * @param value1 Value of the first field being inserted to the table
 * @param key2 Name of the second field being inserted to the table
 * @param value2 Value of the second field being inserted to the table
 * @param key3 Name of the third field being inserted to the table
 * @param value3 Value of the third field being inserted to the table
 */
export const addDeployment = (
  accountName: string,
  accountKey: string,
  tableName: string,
  partitionKey: string,
  filterName: string,
  filterValue: string,
  key1: string,
  value1: string,
  key2?: string,
  value2?: string,
  key3?: string,
  value3?: string
) => {
  const newEntry: any = {};
  newEntry.RowKey = getRowKey();
  newEntry.PartitionKey = partitionKey;
  newEntry[filterName] = filterValue.toLowerCase();
  newEntry[key1] = value1.toLowerCase();
  if (key2 && value2) {
    newEntry[key2] = value2.toLowerCase();
  }
  if (key3 && value3) {
    newEntry[key3] = value3.toLowerCase();
  }
  const tableService = azure.createTableService(accountName, accountKey);
  insertToTable(
    accountName,
    accountKey,
    tableName,
    newEntry,
    (error, result, response) => {
      if (error) {
        logger.error(error.message);
      } else {
        logger.info(`Added new entry for ${filterName} ${filterValue}`);
      }
    }
  );
};

export const updateExistingDeployment = <T>(
  entries: any[],
  accountName: string,
  accountKey: string,
  tableName: string,
  partitionKey: string,
  filterName: string,
  filterValue: string,
  key1: string,
  value1: string,
  key2?: string,
  value2?: string,
  key3?: string,
  value3?: string
) => {
  let addEntity = false;
  if (entries.length !== 0) {
    const entry: any = entries[0];
    if (key1 in entry && entry[key1]._ !== value1.toLowerCase()) {
      addEntity = true;
    }
    entry[key1] = value1.toLowerCase();

    if (key2 && value2) {
      if (key2 in entry && entry[key2]._ !== value2.toLowerCase()) {
        addEntity = true;
      }
      entry[key2] = value2.toLowerCase();
    }

    if (key3 && value3) {
      if (key3 in entry && entry[key3]._ !== value3.toLowerCase()) {
        addEntity = true;
      }
      entry[key3] = value3.toLowerCase();
    }

    const tableService = azure.createTableService(accountName, accountKey);
    if (addEntity) {
      entry.RowKey = getRowKey();
      insertToTable(
        accountName,
        accountKey,
        tableName,
        entry,
        (err, res, response) => {
          if (err) {
            logger.error(err.message);
          } else {
            logger.info(`Added new entry for ${filterName} ${filterValue}`);
          }
        }
      );
    } else {
      updateEntryInTable(
        accountName,
        accountKey,
        tableName,
        entry,
        (err, res, response) => {
          if (err) {
            logger.error(err.message);
          } else {
            logger.info(
              `Updated existing entry for ${filterName} ${filterValue}`
            );
          }
        }
      );
    }
  } else {
    addDeployment(
      accountName,
      accountKey,
      tableName,
      partitionKey,
      filterName,
      filterValue,
      key1,
      value1,
      key2,
      value2,
      key3,
      value3
    );
  }
};

export const insertToTable = (
  accountName: string,
  accountKey: string,
  tableName: string,
  entry: any,
  callback: (error: Error, result: any, response: azure.ServiceResponse) => void
) => {
  const tableService = azure.createTableService(accountName, accountKey);
  tableService.insertEntity(tableName, entry, callback);
};

export const updateEntryInTable = (
  accountName: string,
  accountKey: string,
  tableName: string,
  entry: any,
  callback: (error: Error, result: any, response: azure.ServiceResponse) => void
) => {
  const tableService = azure.createTableService(accountName, accountKey);
  tableService.replaceEntity(tableName, entry, callback);
};

/**
 * Generates a RowKey GUID 12 characters long
 */
export const getRowKey = (): string => {
  return uuid()
    .replace("-", "")
    .substring(0, 12);
};
