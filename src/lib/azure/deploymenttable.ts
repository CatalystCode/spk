import * as azure from "azure-storage";
import uuid from "uuid/v4";
import { logger } from "../../logger";
/**
 * Deployment Table interface to hold necessary information about a table for deployments
 */
export interface IDeploymentTable {
  accountName: string;
  accountKey: string;
  tableName: string;
  partitionKey: string;
}

export interface IRowSrcToACRPipeline {
  PartitionKey: string;
  RowKey: string;
  commitId: string;
  imageTag: string;
  p1: string;
  service: string;
}
export interface IRowACRToHLDPipeline extends IRowSrcToACRPipeline {
  p2: string;
  hldCommitId: string;
  env: string;
  pr?: string;
}

export interface IEntryACRToHLDPipeline {
  RowKey: string;
  PartitionKey: string;
  commitId: string;
  imageTag: string;
  p1: string;
  service: string;
  p2: {
    _: string;
  };
  hldCommitId: {
    _: string;
  };
  env: {
    _: string;
  };
}

export interface IRowHLDToManifestPipeline extends IRowACRToHLDPipeline {
  p3: string;
  manifestCommitId?: string;
}
export interface IEntryHLDToManifestPipeline {
  RowKey: string;
  PartitionKey: string;
  commitId: string;
  env: string;
  imageTag: string;
  p1: string;
  service: string;
  p2: string;
  hldCommitId: string;
  p3: {
    _: string;
  };
  manifestCommitId: {
    _: string;
  };
}
export interface IRowManifest extends IRowHLDToManifestPipeline {
  manifestCommitId: string;
}

export const getTableService = (
  tableInfo: IDeploymentTable
): azure.TableService => {
  return azure.createTableService(tableInfo.accountName, tableInfo.accountKey);
};

/**
 * Adds a new deployment in storage for SRC to ACR pipeline.
 *
 * @param tableInfo table info interface containing information about the storage for deployments
 * @param pipelineId Identifier of the first pipeline
 * @param imageTag image tag name
 * @param serviceName service name
 * @param commitId commit identifier
 */
export const addSrcToACRPipeline = async (
  tableInfo: IDeploymentTable,
  pipelineId: string,
  imageTag: string,
  serviceName: string,
  commitId: string
): Promise<IRowSrcToACRPipeline> => {
  const entry: IRowSrcToACRPipeline = {
    PartitionKey: tableInfo.partitionKey,
    RowKey: getRowKey(),
    commitId,
    imageTag,
    p1: pipelineId,
    service: serviceName
  };
  await insertToTable(tableInfo, entry);
  logger.info("Added first pipeline details to the database");
  return entry;
};

export const updateMatchingArcToHLDPipelineEntry = async (
  entries: IEntryACRToHLDPipeline[],
  tableInfo: IDeploymentTable,
  pipelineId: string,
  imageTag: string,
  hldCommitId: string,
  env: string,
  pr?: string
): Promise<IRowACRToHLDPipeline | null> => {
  const found = (entries || []).find((entry: IEntryACRToHLDPipeline) => {
    return (
      (entry.p2 ? entry.p2._ === pipelineId : true) &&
      (entry.hldCommitId ? entry.hldCommitId._ === hldCommitId : true) &&
      (entry.env ? entry.env._ === env : true)
    );
  });

  if (found) {
    const updateEntry: IRowACRToHLDPipeline = {
      PartitionKey: found.PartitionKey,
      RowKey: found.RowKey,
      commitId: found.commitId,
      env: env.toLowerCase(),
      hldCommitId: hldCommitId.toLowerCase(),
      imageTag: found.imageTag,
      p1: found.p1,
      p2: pipelineId.toLowerCase(),
      service: found.service
    };
    if (pr) {
      updateEntry.pr = pr.toLowerCase();
    }
    await updateEntryInTable(tableInfo, updateEntry);
    return updateEntry;
  }
  return null;
};

export const updateLastRowOfArcToHLDPipelines = async (
  entries: IEntryACRToHLDPipeline[],
  tableInfo: IDeploymentTable,
  pipelineId: string,
  imageTag: string,
  hldCommitId: string,
  env: string,
  pr?: string
): Promise<IRowACRToHLDPipeline> => {
  const lastEntry = entries[entries.length - 1];
  const last: IRowACRToHLDPipeline = {
    PartitionKey: lastEntry.PartitionKey,
    RowKey: lastEntry.RowKey,
    commitId: lastEntry.commitId,
    env: env.toLowerCase(),
    hldCommitId: hldCommitId.toLowerCase(),
    imageTag: lastEntry.imageTag,
    p1: lastEntry.p1,
    p2: pipelineId.toLowerCase(),
    service: lastEntry.service
  };
  if (pr) {
    last.pr = pr.toLowerCase();
  }
  await insertToTable(tableInfo, last);
  logger.info(
    `Added new p2 entry for imageTag ${imageTag} by finding a similar entry`
  );
  return last;
};

export const addNewRowToArcToHLDPipelines = async (
  tableInfo: IDeploymentTable,
  pipelineId: string,
  imageTag: string,
  hldCommitId: string,
  env: string,
  pr?: string
): Promise<IRowACRToHLDPipeline> => {
  const newEntry: IRowACRToHLDPipeline = {
    PartitionKey: tableInfo.partitionKey,
    RowKey: getRowKey(),
    commitId: "",
    env: env.toLowerCase(),
    hldCommitId: hldCommitId.toLowerCase(),
    imageTag: imageTag.toLowerCase(),
    p1: "",
    p2: pipelineId.toLowerCase(),
    service: ""
  };
  if (pr) {
    newEntry.pr = pr.toLowerCase();
  }
  await insertToTable(tableInfo, newEntry);
  logger.info(
    `Added new p2 entry for imageTag ${imageTag} - no matching entry was found.`
  );
  return newEntry;
};

/**
 * Updates the ACR to HLD pipeline in the storage by finding its corresponding SRC to ACR pipeline
 * @param tableInfo table info interface containing information about the storage for deployments
 * @param pipelineId identifier for the ACR to HLD pipeline
 * @param imageTag image tag name
 * @param hldCommitId commit identifier into HLD
 * @param env environment name, such as Dev, Staging etc.
 */
export const updateACRToHLDPipeline = async (
  tableInfo: IDeploymentTable,
  pipelineId: string,
  imageTag: string,
  hldCommitId: string,
  env: string,
  pr?: string
): Promise<IRowACRToHLDPipeline> => {
  const entries = (await findMatchingDeployments(
    tableInfo,
    "imageTag",
    imageTag
  )) as IEntryACRToHLDPipeline[];

  // 1. try to find the matching entry.
  if (entries && entries.length > 0) {
    const found = await updateMatchingArcToHLDPipelineEntry(
      entries,
      tableInfo,
      pipelineId,
      imageTag,
      hldCommitId,
      env,
      pr
    );

    if (found) {
      return found;
    }

    // 2. when cannot find the entry, we take the last row and INSERT it.
    // TODO: rethink this logic.
    return await updateLastRowOfArcToHLDPipelines(
      entries,
      tableInfo,
      pipelineId,
      imageTag,
      hldCommitId,
      env,
      pr
    );
  }

  // Fallback: Ideally we should not be getting here, because there should
  // always be a p1 for any p2 being created.
  // TODO: rethink this logic.
  return await addNewRowToArcToHLDPipelines(
    tableInfo,
    pipelineId,
    imageTag,
    hldCommitId,
    env,
    pr
  );
};

/**
 * Updates the HLD to manifest pipeline in storage by finding its
 * corresponding SRC to ACR and ACR to HLD pipelines
 * Depending on whether PR is specified or not, it performs a lookup
 * on commit Id and PR to link it to the previous release.
 *
 * @param tableInfo table info interface containing information about
 *        the deployment storage table
 * @param hldCommitId commit identifier into the HLD repo, used as a
 *        filter to find corresponding deployments
 * @param pipelineId identifier of the HLD to manifest pipeline
 * @param manifestCommitId manifest commit identifier
 * @param pr pull request identifier
 */
export const updateHLDToManifestPipeline = async (
  tableInfo: IDeploymentTable,
  hldCommitId: string,
  pipelineId: string,
  manifestCommitId?: string,
  pr?: string
): Promise<IRowHLDToManifestPipeline> => {
  let entries = (await findMatchingDeployments(
    tableInfo,
    "hldCommitId",
    hldCommitId
  )) as IEntryHLDToManifestPipeline[];

  // cannot find entries by hldCommitId.
  // attempt to find entries by pr
  if ((!entries || entries.length === 0) && pr) {
    entries = (await findMatchingDeployments(
      tableInfo,
      "pr",
      pr
    )) as IEntryHLDToManifestPipeline[];
  }
  return updateHLDtoManifestHelper(
    entries,
    tableInfo,
    hldCommitId,
    pipelineId,
    manifestCommitId,
    pr
  );
};

export const updateHLDtoManifestEntry = async (
  entries: IEntryHLDToManifestPipeline[],
  tableInfo: IDeploymentTable,
  pipelineId: string,
  manifestCommitId?: string,
  pr?: string
): Promise<IRowHLDToManifestPipeline | null> => {
  const found = entries.find(
    (entry: IEntryHLDToManifestPipeline) =>
      (entry.p3 ? entry.p3._ === pipelineId : true) &&
      (entry.manifestCommitId
        ? entry.manifestCommitId._ === manifestCommitId
        : true)
  );

  if (found) {
    const entry: IRowHLDToManifestPipeline = {
      PartitionKey: found.PartitionKey,
      RowKey: found.RowKey,
      commitId: found.commitId,
      env: found.env,
      hldCommitId: found.hldCommitId,
      imageTag: found.imageTag,
      p1: found.p1,
      p2: found.p2,
      p3: pipelineId.toLowerCase(),
      service: found.service
    };
    if (manifestCommitId) {
      entry.manifestCommitId = manifestCommitId.toLowerCase();
    }
    if (pr) {
      entry.pr = pr;
    }
    await updateEntryInTable(tableInfo, entry);
    logger.info(
      "Updated third pipeline details for its corresponding pipeline"
    );
    return entry;
  }
  return null;
};

export const updateLastHLDtoManifestEntry = async (
  entries: IEntryHLDToManifestPipeline[],
  tableInfo: IDeploymentTable,
  hldCommitId: string,
  pipelineId: string,
  manifestCommitId?: string,
  pr?: string
): Promise<IRowHLDToManifestPipeline> => {
  const lastEntry = entries[entries.length - 1];
  const newEntry: IRowHLDToManifestPipeline = {
    PartitionKey: lastEntry.PartitionKey,
    RowKey: getRowKey(),
    commitId: lastEntry.commitId,
    env: lastEntry.env,
    hldCommitId: hldCommitId.toLowerCase(),
    imageTag: lastEntry.imageTag,
    p1: lastEntry.p1,
    p2: lastEntry.p2,
    p3: pipelineId.toLowerCase(),
    service: lastEntry.service
  };
  if (manifestCommitId) {
    newEntry.manifestCommitId = manifestCommitId.toLowerCase();
  }
  if (pr) {
    newEntry.pr = pr.toLowerCase();
  }

  await insertToTable(tableInfo, newEntry);
  logger.info(
    `Added new p3 entry for hldCommitId ${hldCommitId} by finding a similar entry`
  );
  return newEntry;
};

export const addNewRowToHLDtoManifestPipeline = async (
  tableInfo: IDeploymentTable,
  hldCommitId: string,
  pipelineId: string,
  manifestCommitId?: string,
  pr?: string
) => {
  const newEntry: IRowHLDToManifestPipeline = {
    PartitionKey: tableInfo.partitionKey,
    RowKey: getRowKey(),
    commitId: "",
    env: "",
    hldCommitId: hldCommitId.toLowerCase(),
    imageTag: "",
    p1: "",
    p2: "",
    p3: pipelineId.toLowerCase(),
    service: ""
  };
  if (manifestCommitId) {
    newEntry.manifestCommitId = manifestCommitId.toLowerCase();
  }
  if (pr) {
    newEntry.pr = pr.toLowerCase();
  }
  await insertToTable(tableInfo, newEntry);
  logger.info(
    `Added new p3 entry for hldCommitId ${hldCommitId} - no matching entry was found.`
  );
  return newEntry;
};

/**
 * Updates HLD to Manifest pipeline in storage by going through entries that could
 * be a possible match in the storage.
 *
 * @param entries list of entries that this build could be linked to
 * @param tableInfo table info interface containing information about the
 *        deployment storage table
 * @param hldCommitId commit identifier into the HLD repo, used as a filter
 *        to find corresponding deployments
 * @param pipelineId identifier of the HLD to manifest pipeline
 * @param manifestCommitId manifest commit identifier
 * @param pr pull request identifier
 */
export const updateHLDtoManifestHelper = async (
  entries: IEntryHLDToManifestPipeline[],
  tableInfo: IDeploymentTable,
  hldCommitId: string,
  pipelineId: string,
  manifestCommitId?: string,
  pr?: string
): Promise<IRowHLDToManifestPipeline> => {
  if (entries && entries.length > 0) {
    const updated = await updateHLDtoManifestEntry(
      entries,
      tableInfo,
      pipelineId,
      manifestCommitId,
      pr
    );

    if (updated) {
      return updated;
    }

    // 2. when cannot find the entry, we take the last row and INSERT it.
    // TODO: rethink this logic.
    return await updateLastHLDtoManifestEntry(
      entries,
      tableInfo,
      hldCommitId,
      pipelineId,
      manifestCommitId,
      pr
    );
  }

  // Fallback: Ideally we should not be getting here, because there should
  // always matching entry
  // TODO: rethink this logic.
  return await addNewRowToHLDtoManifestPipeline(
    tableInfo,
    hldCommitId,
    pipelineId,
    manifestCommitId,
    pr
  );
};

/**
 * Updates manifest commit identifier in the storage for a pipeline identifier in HLD to manifest pipeline
 * @param tableInfo table info interface containing information about the deployment storage table
 * @param pipelineId identifier of the HLD to manifest pipeline, used as a filter to find the deployment
 * @param manifestCommitId manifest commit identifier to be updated
 */
export const updateManifestCommitId = async (
  tableInfo: IDeploymentTable,
  pipelineId: string,
  manifestCommitId: string
): Promise<IRowManifest> => {
  const entries = (await findMatchingDeployments(
    tableInfo,
    "p3",
    pipelineId
  )) as IRowManifest[];
  // Ideally there should only be one entry for every pipeline id
  if (entries.length > 0) {
    const entry = entries[0];
    entry.manifestCommitId = manifestCommitId;
    await updateEntryInTable(tableInfo, entry);
    logger.info(
      `Update manifest commit Id ${manifestCommitId} for pipeline Id ${pipelineId}`
    );
    return entry;
  }
  throw new Error(
    `No manifest generation found to update manifest commit ${manifestCommitId}`
  );
};

/**
 * Finds matching deployments for a filter name and filter value in the storage
 * @param tableInfo table info interface containing information about the deployment storage table
 * @param filterName name of the filter, such as `imageTag`
 * @param filterValue value of the filter, such as `hello-spk-master-1234`
 */
export const findMatchingDeployments = (
  tableInfo: IDeploymentTable,
  filterName: string,
  filterValue: string
): Promise<unknown[]> => {
  const tableService = getTableService(tableInfo);
  const query: azure.TableQuery = new azure.TableQuery().where(
    `PartitionKey eq '${tableInfo.partitionKey}'`
  );
  query.and(`${filterName} eq '${filterValue}'`);

  // To get around issue https://github.com/Azure/azure-storage-node/issues/545, set below to null
  const nextContinuationToken:
    | azure.TableService.TableContinuationToken
    | any = null;

  return new Promise((resolve, reject) => {
    tableService.queryEntities(
      tableInfo.tableName,
      query,
      nextContinuationToken,
      (error, result) => {
        if (!error) {
          resolve(result.entries);
        } else {
          reject(error);
        }
      }
    );
  });
};

/**
 * Inserts a new entry into the table.
 *
 * @param tableInfo Table Information
 * @param entry entry to insert
 */
export const insertToTable = (
  tableInfo: IDeploymentTable,
  entry: IRowSrcToACRPipeline | IRowACRToHLDPipeline | IRowHLDToManifestPipeline
) => {
  const tableService = getTableService(tableInfo);

  return new Promise((resolve, reject) => {
    tableService.insertEntity(tableInfo.tableName, entry, err => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
};

export const deleteFromTable = (
  tableInfo: IDeploymentTable,
  entry: IRowSrcToACRPipeline | IRowACRToHLDPipeline | IRowHLDToManifestPipeline
) => {
  const tableService = getTableService(tableInfo);

  return new Promise((resolve, reject) => {
    tableService.deleteEntity(tableInfo.tableName, entry, {}, err => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
};

/**
 * Updates an entry in the table.
 *
 * @param tableInfo Table Information
 * @param entry entry to update
 */
export const updateEntryInTable = (
  tableInfo: IDeploymentTable,
  entry:
    | IRowSrcToACRPipeline
    | IRowACRToHLDPipeline
    | IRowHLDToManifestPipeline
    | IRowManifest
) => {
  const tableService = getTableService(tableInfo);

  return new Promise((resolve, reject) => {
    tableService.replaceEntity(tableInfo.tableName, entry, err => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
};

/**
 * Generates a RowKey GUID 12 characters long
 */
export const getRowKey = (): string => {
  return uuid()
    .replace("-", "")
    .substring(0, 12);
};
