import commander from "commander";
import fs from "fs";
import shell from "shelljs";
import { logger } from "../../logger";
import { exec } from "../../lib/shell";
import path from "path";

/**
 * Adds the init command to the commander command object
 *
 * @param command Commander command object to decorate
 */

let InitIsDone: boolean = true;
let bedrockDir: string = `${process.cwd()}/../.bedrock/bedrock/cluster/environments`;
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
      "--resourcegroup <rg_name>",
      "Name of resource group to deploy Bedrock Environment to"
    )
    .option(
      "--cluster-name <cluster-name>",
      "Name of the AKS cluster to deploy in environment"
    )
    .option(
      "--gitops-url <url_gitops>",
      "URL to HLD gitops manifests to apply to AKS cluster"
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
            "You need to specify each of the config settings in order to run any command."
          );
        }
        validateInit();
        await templateInit();
        //await templateConfig();
        //await templateDeploy();
      } catch (err) {
        logger.error("Error occured while initializing");
        logger.error(err);
      }
    });
};

const validateInit = async () => {
  try {
    if (InitIsDone) {
      logger.info(
        "`spk infra init` has been successfully executed, you may now proceed to deploy Bedrock environments."
      );
    } else {
      logger.info(
        "`spk infra init` has not been successfully executed, please run this command to assure all Bedrock prerequisites are installed. "
      );
    }
  } finally {
    logger.info(bedrockDir);
    process.chdir(bedrockDir);
    // Debugging
    const out = await exec("ls");
    //logger.info(out);
  }
};

const templateInit = async () => {
  try {
    // Identify which environment the user selected (hardcoded to azure-single)
    // logger.info(opts.environment)
    const EnvironmentPath = path.join(bedrockDir, "azure-simple");
    const silent = false;
    const output = "";
    process.chdir(EnvironmentPath);
    // Terraform init in environment directory
    shell.exec(
      "terraform init",
      { silent: !!silent },
      (code, stdout, stderr) => {
        logger.info("Exit code:", code);
        logger.info(stdout);
        if (output) {
          fs.writeFileSync(output, stdout, { encoding: "utf8" });
        }
        if (stderr) {
          logger.error(stderr);
        }
      }
    );
  } catch (_) {
    logger.warn(`Unable to run Terraform Init on the environment directory.`);
    return "";
  }
};

//     }
// const templateConfig = async () => {
//     try {
//         const infraInit = await validateInit();
//         const infraInit = await templateInit()
//         return azureAuth;
//         } catch (_) {
//         logger.warn(`Unable to authenticate with Azure. Please run 'az login'.`);
//         return "";
//         }
// }
// const templateDeploy = async () => {
//     try {
//         const infraInit = await validateInit();
//         return azureAuth;
//       } catch (_) {
//         logger.warn(`Unable to authenticate with Azure. Please run 'az login'.`);
//         return "";
//       }
// }
