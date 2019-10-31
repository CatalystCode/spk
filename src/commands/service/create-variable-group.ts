import { VariableGroup } from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import commander from "commander";
import { echo } from "shelljs";
import { Config } from "../../config";
import { IAzureDevOpsOpts } from "../../lib/git";
import { addVariableGroup } from "../../lib/pipelines/variableGroup";
import { logger } from "../../logger";
import { IVariableGroupData } from "../../types";
import { writeConfigToDefaultLocation } from "../init";

/**
 * Adds the create command to the variable-group command object
 *
 * @param command Commander command object to decorate
 */
export const createVariablegroupCommandDecorator = (
  command: commander.Command
): void => {
  command
    .command("create-variable-group <variable-group-name>")
    .alias("cvg")
    .description(
      "Create a new variable group in Azure DevOps project with specific variables (ACR name, HLD Repo name, Personal Access Token, Service Principal id, Service Principal password, and Azure AD tenant id)"
    )
    .option(
      "-r, --registry-name <registry-name>",
      "The name of the existing Azure Container Registry."
    )
    .option(
      "-d, --hld-repo-name <hld-repo-name>",
      "The high level definition (HLD) git repo name."
    )
    .option(
      "-u, --service-principal-id <service-principal-id>",
      "Azure service principal id with `contributor` role in Azure Container Registry"
    )
    .option(
      "-p, --service-principal-password <service-principal-password>",
      "The Azure service principal password"
    )
    .option(
      "-t, --tenant <tenant>",
      "The Azure AD tenant id of service principal"
    )
    .option(
      "--org-name <organization-name>",
      "Azure DevOps organization name; falls back to azure_devops.org in spk config"
    )
    .option(
      "--project <project>",
      "Azure DevOps project name; falls back to azure_devops.project in spk config"
    )
    .option(
      "--personal-access-token <personal-access-token>",
      "Azure DevOps Personal access token; falls back to azure_devops.access_token in spk config"
    )
    .action(async (variableGroupName, opts) => {
      try {
        const {
          registryName,
          hldRepoName,
          servicePrincipalId,
          servicePrincipalPassword,
          tenant
        } = opts;

        const { azure_devops } = Config();

        const {
          orgName = azure_devops && azure_devops.org,
          personalAccessToken = azure_devops && azure_devops.access_token,
          project = azure_devops && azure_devops.project
        } = opts;

        const accessOpts: IAzureDevOpsOpts = {
          orgName,
          personalAccessToken,
          project
        };

        logger.debug(`access options: ${JSON.stringify(accessOpts)}`);

        // required parameters check
        const errors: string[] = await validateRequiredArguments(
          variableGroupName,
          registryName,
          hldRepoName,
          servicePrincipalId,
          servicePrincipalPassword,
          tenant,
          accessOpts
        );

        if (errors.length !== 0) {
          logger.error(
            `the following arguments are required: ${errors.join("")}`
          );
          return errors;
        }

        const variableGroup = await create(
          variableGroupName,
          registryName,
          hldRepoName,
          servicePrincipalId,
          servicePrincipalPassword,
          tenant,
          accessOpts
        );

        // set the variable group name
        await setVariableGroupConfig(variableGroup.name!);

        // print newly created variable group
        echo(JSON.stringify(variableGroup, null, 2));

        logger.info(
          "Successfully created a variable group in Azure DevOps project!"
        );
      } catch (err) {
        logger.error(`Error occurred while creating variable group`);
        logger.error(err);
      }
    });
};

/**
 * Creates a Azure DevOps variable group
 *
 * @param variableGroupName The Azure DevOps varible group name
 * @param registryName The Azure container registry name
 * @param hldRepoName The HLD repo name
 * @param servicePrincipalId The Azure service principal id with ACR pull and build permissions for az login
 * @param servicePrincipalPassword The service principal password for az login
 * @param tenantId The Azure AD tenant id for az login
 * @param accessOpts Azure DevOps access options from command options to override spk config
 */
export const create = async (
  variableGroupName: string,
  registryName: string,
  hldRepoName: string,
  servicePrincipalId: string,
  servicePrincipalPassword: string,
  tenantId: string,
  accessOpts: IAzureDevOpsOpts
): Promise<VariableGroup> => {
  logger.info(
    `Creating Variable Group from group definition '${variableGroupName}'`
  );
  try {
    // validate input
    await validateRequiredArguments(
      variableGroupName,
      registryName,
      hldRepoName,
      servicePrincipalId,
      servicePrincipalPassword,
      tenantId,
      accessOpts
    );

    // validate variable group type"
    const vars: any = {
      ACR_NAME: {
        value: registryName
      },
      HLD_REPO: {
        value: hldRepoName
      },
      PAT: {
        isSecret: true,
        value: accessOpts.personalAccessToken
      },
      SP_APP_ID: {
        isSecret: true,
        value: servicePrincipalId
      },
      SP_PASS: {
        isSecret: true,
        value: servicePrincipalPassword
      },
      SP_TENANT: {
        isSecret: true,
        value: tenantId
      }
    };
    const variableGroupData: IVariableGroupData = {
      description: "Created from spk CLI",
      name: variableGroupName,
      type: "Vsts",
      variables: vars
    };

    return await addVariableGroup(variableGroupData, accessOpts);
  } catch (err) {
    throw err;
  }
};

/**
 * Checks arguments for undefined or null and returns errors
 *
 * @param variableGroupName The Azure DevOps varible group name
 * @param registryName The Azure container registry name
 * @param servicePrincipalId The Azure service principla id with ACR pull and build permissions for az login
 * @param servicePrincipalPassword The service principla password for az login
 * @param tenantId The Azure AD tenant id for az login
 */
export const validateRequiredArguments = async (
  variableGroupName: any,
  registryName: any,
  hldRepoName: any,
  servicePrincipalId: any,
  servicePrincipalPassword: any,
  tenant: any,
  accessOpts: IAzureDevOpsOpts
): Promise<string[]> => {
  const errors: string[] = [];

  if (variableGroupName === undefined || variableGroupName === "") {
    errors.push("\n <variable-group-name>");
  }

  if (registryName === undefined || registryName === "") {
    errors.push("\n -r / --registry-name");
  }

  if (hldRepoName === undefined || hldRepoName === "") {
    errors.push("\n -d / --hld-repo-name");
  }

  if (servicePrincipalId === undefined || servicePrincipalId === "") {
    errors.push("\n -u / --service-principal-id");
  }

  if (
    servicePrincipalPassword === undefined ||
    servicePrincipalPassword === ""
  ) {
    errors.push("\n -p / --service-principal-password");
  }

  if (tenant === undefined || servicePrincipalPassword === "") {
    errors.push("\n -t / --tenant");
  }

  if (accessOpts.orgName === undefined || accessOpts.orgName === "") {
    errors.push("\n --org-name / azure_devops:org is not set in spk config");
  }

  if (
    accessOpts.personalAccessToken === undefined ||
    accessOpts.personalAccessToken === ""
  ) {
    errors.push(
      "\n --personal-access-token / azure_devops:access_token is not set in spk config"
    );
  }

  if (accessOpts.project === undefined || accessOpts.project === "") {
    errors.push("\n --project / azure_devops:project is not set in spk config");
  }

  return errors;
};

/**
 * Sets the variable group name in ./spk/config.yaml
 *
 * @param variableGroupName The varible group name
 */
export const setVariableGroupConfig = async (variableGroupName: string) => {
  if (
    variableGroupName === undefined ||
    variableGroupName === null ||
    variableGroupName === ""
  ) {
    throw new Error("Variable Group Name is null");
  }
  // set variable name in the config object
  Config().azure_devops!.variable_group = variableGroupName;

  // write to the disk
  writeConfigToDefaultLocation();
};
