import commander from "commander";
import { Config } from "../../config";
import {
  addSrcToACRPipeline,
  deleteFromTable,
  findMatchingDeployments,
  IDeploymentTable,
  updateACRToHLDPipeline,
  updateHLDToManifestPipeline,
  updateManifestCommitId
} from "../../lib/azure/deploymenttable";
import { storageAccountExists } from "../../lib/azure/storage";
import { logger } from "../../logger";
import { isValidStorageAccount } from "./validate";

const service = "spk-self-test";

/**
 * Adds the self-test command to the commander command object
 * @param command Commander command object to decorate
 */
export const selfTestCommandDecorator = (command: commander.Command): void => {
  command
    .command("self-test")
    .alias("st")
    .description("Validate the configuration and storage account are correct.")
    .action(async () => {
      const config = Config();
      const isValid = await isValidStorageAccount();

      if (!isValid) {
        logger.info(
          "Please provide a valid storage account in the configuration file."
        );
        return;
      }

      // Delete test data
      // Write test data
    });
};

export const writeSelfTestData = async (
  accountKey: string,
  accountName: string,
  partitionKey: string,
  tableName: string
): Promise<any> => {
  // call create
  const tableInfo: IDeploymentTable = {
    accountKey,
    accountName,
    partitionKey,
    tableName
  };

  try {
    const p1Id = "234671";
    const imageTag = "spk-test-123";
    const commitId = "6nbe";
    const env = "SPK-TEST";

    logger.info("Adding src to ACR data to service introspection...");
    await addSrcToACRPipeline(tableInfo, p1Id, imageTag, service, commitId);

    const p2Id = "932629";
    logger.info("Adding ACR to HLD data to service introspection...");
    await updateACRToHLDPipeline(tableInfo, p2Id, imageTag, commitId, env);
  } catch (err) {
    logger.error("Error writing data to service introspection.");
    logger.error(err);
  }
};

export const deleteSelfTestData = async (
  accountKey: string,
  accountName: string,
  partitionKey: string,
  tableName: string
): Promise<any> => {
  // search by service
  const tableInfo: IDeploymentTable = {
    accountKey,
    accountName,
    partitionKey,
    tableName
  };

  findMatchingDeployments(tableInfo, "service", service).then(async entries => {
    let entryToDelete: any;
    logger.info("Deleting test data...");
    try {
      for (const entry of entries) {
        entryToDelete = entry;
        await deleteFromTable(tableInfo, entry);
      }
    } catch (err) {
      logger.error("Error deleting test data.");
      logger.error(err);
    }
  });
};
