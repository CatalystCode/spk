import Table from "cli-table";
import commander from "commander";
import Deployment from "spektate/lib/Deployment";
import { logger } from "../../logger";
import { verifyAppConfiguration } from "./init";
import { clusterPipeline, config, hldPipeline, srcPipeline } from "./init";

/**
 * Output formats to display service details
 */
export enum OUTPUT_FORMAT {
  /**
   * Normal format
   */
  NORMAL = 0,

  /**
   * Wide table format
   */
  WIDE = 1,

  /**
   * JSON format
   */
  JSON = 2
}

/**
 * Adds the get command to the commander command object
 * @param command Commander command object to decorate
 */
export const getCommandDecorator = (command: commander.Command): void => {
  command
    .command("get")
    .alias("g")
    .description(
      "Get deployment(s) for a service, release environment, build Id, commit Id, or image tag."
    )
    .option(
      "-b, --build-id <build-id>",
      "Get deployments for a particular build Id from source repository"
    )
    .option(
      "-c, --commit-id <commit-id>",
      "Get deployments for a particular commit Id from source repository"
    )
    .option(
      "-d, --deployment-id <deployment-id>",
      "Get deployments for a particular deployment Id from source repository"
    )
    .option(
      "-i, --image-tag <image-tag>",
      "Get deployments for a particular image tag"
    )
    .option(
      "-e, --env <environment>",
      "Get deployments for a particular environment"
    )
    .option(
      "-s, --service <service-name>",
      "Get deployments for a particular service"
    )
    .option(
      "-o, --output <output-format>",
      "Get output in one of these forms: normal, wide, JSON"
    )
    .action(async opts => {
      try {
        verifyAppConfiguration(() => {
          getDeployments(
            processOutputFormat(opts.output),
            opts.env,
            opts.imageTag,
            opts.buildId,
            opts.commitId,
            opts.service,
            opts.deploymentId
          );
        });
      } catch (err) {
        logger.error(`Error occurred while getting deployment(s)`);
        logger.error(err);
      }
    });
};

/**
 * Processes the output format based on defaults
 * @param outputFormat Output format specified by the user
 */
function processOutputFormat(outputFormat: string): OUTPUT_FORMAT {
  if (outputFormat && outputFormat.toLowerCase() === "wide") {
    return OUTPUT_FORMAT.WIDE;
  } else if (outputFormat && outputFormat.toLowerCase() === "json") {
    return OUTPUT_FORMAT.JSON;
  }

  return OUTPUT_FORMAT.NORMAL;
}

/**
 * Gets a list of deployments for the specified filters
 */
export const getDeployments = (
  outputFormat: OUTPUT_FORMAT,
  environment?: string,
  imageTag?: string,
  p1Id?: string,
  commitId?: string,
  service?: string,
  deploymentId?: string
): Promise<Deployment[]> => {
  return Deployment.getDeploymentsBasedOnFilters(
    config.STORAGE_ACCOUNT_NAME,
    config.STORAGE_ACCOUNT_KEY,
    config.STORAGE_TABLE_NAME,
    config.STORAGE_PARTITION_KEY,
    srcPipeline,
    hldPipeline,
    clusterPipeline,
    environment,
    imageTag,
    p1Id,
    commitId,
    service,
    deploymentId
  ).then((deployments: Deployment[]) => {
    if (outputFormat === OUTPUT_FORMAT.JSON) {
      logger.info(JSON.stringify(deployments, null, 2));
    } else {
      printDeployments(deployments, outputFormat);
    }
    return deployments;
  });
};

/**
 * Prints deployments in a terminal table
 */
export const printDeployments = (
  deployments: Deployment[],
  outputFormat: OUTPUT_FORMAT
) => {
  if (deployments.length > 0) {
    let row = [];
    row.push("Start Time");
    row.push("Service");
    row.push("Deployment");
    row.push("Commit");
    row.push("Src to ACR");
    row.push("Image Tag");
    row.push("Result");
    row.push("ACR to HLD");
    row.push("Env");
    row.push("Hld Commit");
    row.push("Result");
    row.push("HLD to Manifest");
    row.push("Result");
    if (outputFormat === OUTPUT_FORMAT.WIDE) {
      row.push("Duration");
      row.push("Status");
      row.push("Manifest Commit");
      row.push("End Time");
    }
    const table = new Table({ head: row });
    deployments.forEach(deployment => {
      row = [];
      row.push(
        deployment.srcToDockerBuild
          ? deployment.srcToDockerBuild.startTime.toLocaleString()
          : ""
      );
      row.push(deployment.service);
      row.push(deployment.deploymentId);
      row.push(deployment.commitId);
      row.push(
        deployment.srcToDockerBuild ? deployment.srcToDockerBuild.id : ""
      );
      row.push(deployment.imageTag);
      row.push(
        deployment.srcToDockerBuild
          ? getStatus(deployment.srcToDockerBuild.result)
          : ""
      );
      row.push(
        deployment.dockerToHldRelease ? deployment.dockerToHldRelease.id : ""
      );
      row.push(deployment.environment.toUpperCase());
      row.push(deployment.hldCommitId);
      row.push(
        deployment.dockerToHldRelease
          ? getStatus(deployment.dockerToHldRelease.status)
          : ""
      );
      row.push(
        deployment.hldToManifestBuild ? deployment.hldToManifestBuild.id : ""
      );
      row.push(
        deployment.hldToManifestBuild
          ? getStatus(deployment.hldToManifestBuild.result)
          : ""
      );
      if (outputFormat === OUTPUT_FORMAT.WIDE) {
        row.push(deployment.duration() + " mins");
        row.push(deployment.status());
        row.push(deployment.manifestCommitId);
        row.push(
          deployment.hldToManifestBuild &&
            deployment.hldToManifestBuild.finishTime &&
            !isNaN(deployment.hldToManifestBuild.finishTime.getTime())
            ? deployment.hldToManifestBuild.finishTime.toLocaleString()
            : ""
        );
      }
      table.push(row);
    });

    logger.info(table.toString());
  } else {
    logger.info("No deployments found for specified filters.");
  }
};

/**
 * Gets a status indicator icon
 */
const getStatus = (status: string) => {
  if (status === "succeeded") {
    return "\u2713";
  } else if (!status) {
    return "...";
  }
  return "\u0445";
};
