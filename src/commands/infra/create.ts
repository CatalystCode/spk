import commander from "commander";
import fs, { chmod } from "fs";
import { logger } from "../../logger";
import { exec } from "../../lib/shell";
import path from "path";
import { promisify } from "util";

// Global vars that attain if spk infra init has been executed and the path to a bedrock template directory
let InitIsDone: boolean = true; //Holder until spk infra init integration
let bedrockDir: string = `${process.cwd()}/.bedrock/cluster/environments`;
let rootDir: string = `${process.cwd()}`;

/**
 * Adds the init command to the commander command object
 *
 * @param command Commander command object to decorate
 */
export const createCommandDecorator = (command: commander.Command): void => {
  command
    .command("create")
    .alias("c")
    .description(
      "Create a bedrock template based on user args and deploy infrastructure template to a provided subscription."
    )
    .option(
      "-e, --environment <environment-name>",
      "Deploy an Infra Environment from Bedrock"
    )
    .option(
      "--resource-group <rg_name>",
      "Name of resource group to deploy Bedrock Environment to"
    )
    .option(
      "--cluster-name <cluster-name>",
      "Name of the AKS cluster to deploy in environment",
      "spk-AKScluster"
    )
    .option(
      "--gitops-url <url_gitops>",
      "URL to HLD gitops manifests to apply to AKS cluster",
      "git@github.com:timfpark/fabrikate-cloud-native-manifests.git"
    )
    .option(
      "--serviceprincipalid <sp-id>",
      "Service Principal ID for Azure Subscription"
    )
    .option(
      "--serviceprincipalsecret <sp-secret> ",
      "Service Principal Secret for Azure Subscription"
    )
    .action(async opts => {
      try {
        if (
          opts.environment &&
          opts.serviceprincipalid &&
          opts.serviceprincipalsecret
        ) {
        } else {
          logger.warn(
            "You need to specify each of the config settings in order to run any command. Please verify you have passed an Environment, Service Principal ID, and Service Principal Secret"
          );
        }
        await validateInit(bedrockDir);
        await templateInit(bedrockDir, opts.environment);
      } catch (err) {
        logger.error("Error occurred while initializing");
        logger.error(err);
      }
    });
};

/**
 * Checks if working bedrock path has been added and infra init command has been ran
 *
 * @param bedrockPath Source directory to working bedrock templates
 */
export const validateInit = async (bedrockPath: string): Promise<boolean> => {
  try {
    // TODO: Use this function to check the state of spk infra init and attain bedrock source location
    if (fs.existsSync(bedrockPath)) {
      if (InitIsDone) {
        logger.info(
          "`spk infra init` has been successfully executed, you may now proceed to deploy Bedrock environments."
        );
        return true;
      } else {
        logger.error(
          "`spk infra init` has not been successfully executed, please run this command to assure all Bedrock prerequisites are installed. "
        );
        return false;
      }
    } else {
      logger.error(
        `Provided Bedrock path is invalid or can not be found: ${bedrockPath}`
      );
      return false;
    }
  } catch (_) {
    logger.error(`Unable to Validate Infra Init.`);
    return false;
  }
};

/**
 * Obtains a template from a bedrock source and runs a terraform init
 *
 * @param bedrockPath Source directory to working bedrock templates
 * @param templateEnvironment local sample template user wishes to deploy infrastructure from
 */
export const templateInit = async (
  bedrockPath: string,
  templateEnvironment: string
): Promise<string> => {
  try {
    // Identify which environment the user selected
    const EnvironmentPath = path.join(bedrockPath, templateEnvironment);
    if (fs.existsSync(EnvironmentPath)) {
      logger.info(
        `Initializing Bedrock Template Environment : ${templateEnvironment}`
      );
      logger.info(EnvironmentPath);
      process.chdir(EnvironmentPath);
      // Terraform init in environment directory
      const init = await exec("terraform", ["init"]);
      logger.info(init);
      // Return to original working directory
      process.chdir(rootDir);
      return init;
    } else {
      logger.error(`Template Environment : ${EnvironmentPath} cannot be found`);
      return "";
    }
  } catch (_) {
    logger.warn(`Unable to run Terraform Init on the environment directory.`);
    return "";
  }
};
