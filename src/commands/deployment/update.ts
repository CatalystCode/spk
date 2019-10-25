import commander from "commander";
import open = require("open");
import { updateDeployment } from "../../lib/azure/deploymenttable";
import { exec } from "../../lib/shell";
import { logger } from "../../logger";
import { validatePrereqs } from "../infra/validate";

/**
 * Creates an update command decorator for the command to update a deployment in storage
 * @param command
 */
export const updateCommandDecorator = (command: commander.Command): void => {
  command
    .command("update")
    .alias("u")
    .description("Update the deployment in storage from pipelines")
    .option(
      "-k, --access-key <access-key>",
      "Access key of the storage account"
    )
    .option("-n, --name <account-name>", "Name of the storage account")
    .option(
      "-p, --partition-key <partition-key>",
      "Partition key for the storage account"
    )
    .option("-t, --table-name <table-name>", "Name of table in storage account")
    .option(
      "--filter-name <filter-name>",
      "Name of the distinguishing column of the first, second or third pipeline"
    )
    .option(
      "--filter-value <filter-value>",
      "Value of the first distinguishing column of the first, second or third pipeline"
    )
    .option("--image-tag <image-tag>", "Image tag")
    .option("--commit-id <commit-id>", "Commit Id in source repository")
    .option("--service <service>", "Service name")
    .option("--p2 <p2>", "Identifier for the second pipeline")
    .option("--hld-commit-id <hld-commit-id>", "Commit id in HLD repository")
    .option("--env <env>", "Release environment name")
    .option("--p3 <p3>", "Identifier for the third pipeline")
    .option(
      "--manifest-commit-id <manifest-commit-id>",
      "Commit Id in the manifest repository"
    )
    .action(async opts => {
      if (
        !opts.filterName ||
        !opts.filterValue ||
        !opts.accessKey ||
        !opts.name ||
        !opts.partitionKey ||
        !opts.tableName
      ) {
        logger.error(
          "You must specify all of access key, storage account name, partition key, table name, filter name and filter value"
        );
        return;
      }

      // This is being called from the first pipeline. Make sure all other fields are defined.
      if (opts.filterName === "p1") {
        if (!opts.imageTag || !opts.commitId || !opts.service) {
          logger.error(
            "For updating the details of source pipeline, you must specify --image-tag, --commit-id and --service"
          );
          return;
        }

        updateDeployment(
          opts.name,
          opts.accessKey,
          opts.tableName,
          opts.partitionKey,
          opts.filterName,
          opts.filterValue,
          "imageTag",
          opts.imageTag,
          "commitId",
          opts.commitId,
          "service",
          opts.service
        );
      }

      // This is being called from the second pipeline. Make sure all other fields are defined.
      if (opts.filterName === "imageTag") {
        if (!opts.p2 || !opts.hldCommitId || !opts.env) {
          logger.error(
            "For updating the details of image tag release pipeline, you must specify --p2, --hld-commit-id and --env"
          );
          return;
        }
        updateDeployment(
          opts.name,
          opts.accessKey,
          opts.tableName,
          opts.partitionKey,
          opts.filterName,
          opts.filterValue,
          "p2",
          opts.p2,
          "hldCommitId",
          opts.hldCommitId,
          "env",
          opts.env
        );
      }

      // This is being called from the third pipeline. Make sure all other fields are defined.
      if (opts.filterName === "hldCommitId") {
        if (!opts.p3) {
          logger.error(
            "For updating the details of manifest generation pipeline, you must specify --p3"
          );
          return;
        }
        if (opts.manifestCommitId) {
          updateDeployment(
            opts.name,
            opts.accessKey,
            opts.tableName,
            opts.partitionKey,
            opts.filterName,
            opts.filterValue,
            "p3",
            opts.p3,
            "manifestCommitId",
            opts.manifestCommitId
          );
        } else {
          updateDeployment(
            opts.name,
            opts.accessKey,
            opts.tableName,
            opts.partitionKey,
            opts.filterName,
            opts.filterValue,
            "p3",
            opts.p3
          );
        }
      }

      // This is being called from the third pipeline to update manifest id. Make sure all other fields are defined.
      if (opts.filterName === "p3") {
        if (!opts.manifestCommitId) {
          logger.error(
            "For updating the details of manifest generation pipeline, you must specify --manifest-commit-id"
          );
          return;
        }
        updateDeployment(
          opts.name,
          opts.accessKey,
          opts.tableName,
          opts.partitionKey,
          opts.filterName,
          opts.filterValue,
          "manifestCommitId",
          opts.manifestCommitId
        );
      }
    });
};
