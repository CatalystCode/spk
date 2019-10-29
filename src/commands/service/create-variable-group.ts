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
      "Add a new variable group in Azure DevOps project with specifc varibles[acr name, service principla id, service principla password, and Azure AD tenant]."
    )
    .option(
      "-r, --registry-name <registry-name>",
      "The name of the existing Azure Container Registry."
    )
    .option(
      "-u, --service-principal-id <service-principal-id>",
      "Azure service principal id with `pull` and `build` permissions in Azure Container Registry"
    )
    .option(
      "-p, --service-principal-password <service-principal-password>",
      "Azure service principal password"
    )
    .option("-t, --tenant <tenant>", "The tenant id of Azure Subscription")
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
      "Personal access token associated with the Azure DevOps org; falls back to azure_devops.access_token in spk config"
    )
    .action(async (variableGroupName, opts) => {
      try {
        const {
          registryName,
          servicePrincipalId,
          servicePrincipalPassword,
          tenant,
          orgName,
          project,
          personalAccessToken
        } = opts;

        logger.debug(
          `opts: ${variableGroupName}, ${registryName}, ${servicePrincipalId}, ${servicePrincipalPassword}, ${tenant}`
        );

        // required parameters check
        let errors: string[] = await validateRequiredArguments(
          variableGroupName,
          registryName,
          servicePrincipalId,
          servicePrincipalPassword,
          tenant
        );

        if (errors.length !== 0) {
          logger.error(
            `the following arguments are required: ${errors.join("")}`
          );
          return errors;
        }

        // type check
        errors = await validateArgumentsType(
          variableGroupName,
          registryName,
          servicePrincipalId,
          servicePrincipalPassword,
          tenant,
          orgName,
          project,
          personalAccessToken
        );

        if (errors.length !== 0) {
          logger.error(
            `the following arguments are specified in wrong type: ${errors.join(
              ""
            )}`
          );
          return errors;
        }

        const accessOpts: IAzureDevOpsOpts = {
          orgName,
          personalAccessToken,
          project
        };

        logger.debug(`access options: ${JSON.stringify(accessOpts)}`);

        logger.info(
          "Successfully created a variable group in Azure DevOps project!"
        );

        const variableGroup = await create(
          variableGroupName,
          registryName,
          servicePrincipalId,
          servicePrincipalPassword,
          tenant,
          accessOpts
        );

        // set the variable group name
        Config().azure_devops!.variable_group = variableGroup.name;

        // write to the disk
        writeConfigToDefaultLocation();

        // print results
        echo(JSON.stringify(variableGroup, null, 2));
      } catch (err) {
        logger.error(`Error occurred while creating variable group`);
        logger.error(err);
      }
    });
};

/**
 * Loads varible group manifest from a given filename
 *
 * @param filepath file to read manifest
 * @param accessOpts Azure DevOps access options from command options to override spk config
 */
export const create = async (
  variableGroupName: string,
  registryName: string,
  servicePrincipalId: string,
  servicePrincipalPassword: string,
  tenantId: string,
  accessOpts: IAzureDevOpsOpts
): Promise<VariableGroup> => {
  logger.info(
    `Creating Variable Group from group definition '${variableGroupName}'`
  );
  try {
    // validate variable group type"
    const vars: any = {
      ACR_NAME: {
        value: registryName
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

export const validateRequiredArguments = async (
  variableGroupName: any,
  registryName: any,
  servicePrincipalId: string,
  servicePrincipalPassword: string,
  tenant: string
): Promise<string[]> => {
  const errors: string[] = [];

  if (variableGroupName === undefined) {
    errors.push("\n <variable-group-name>");
  }

  if (registryName === undefined) {
    errors.push("\n -r / --registry-name");
  }

  if (servicePrincipalId === undefined) {
    errors.push("\n -u / --service-principal-id");
  }

  if (servicePrincipalPassword === undefined) {
    errors.push("\n -p / --service-principal-password");
  }

  if (tenant === undefined) {
    errors.push("\n -t / --tenant");
  }

  return errors;
};

export const validateArgumentsType = async (
  variableGroupName: any,
  registryName: any,
  servicePrincipalId: string,
  servicePrincipalPassword: string,
  tenant: string,
  orgName: any,
  project: any,
  personalAccessToken: any
): Promise<string[]> => {
  const errors: string[] = [];
  // type check

  if (typeof variableGroupName !== "string") {
    errors.push(
      `\n --variable-group-name must be of type 'string', ${typeof variableGroupName} specified.`
    );
  }

  if (typeof registryName !== "string") {
    errors.push(
      `\n --org-name must be of type 'string', ${typeof orgName} specified.`
    );
  }

  if (typeof servicePrincipalId !== "string") {
    errors.push(
      `\n ---service-principal-id must be of type 'string', ${typeof servicePrincipalId} specified.`
    );
  }

  if (typeof servicePrincipalPassword !== "string") {
    errors.push(
      `\n ---service-principal-password must be of type 'string', ${typeof servicePrincipalPassword} specified.`
    );
  }

  if (typeof tenant !== "string") {
    errors.push(
      `\n ---tenant must be of type 'string', ${typeof tenant} specified.`
    );
  }

  if (typeof orgName !== "undefined" && typeof orgName !== "string") {
    errors.push(
      `\n --org-name must be of type 'string', ${typeof orgName} specified.`
    );
  }

  if (typeof project !== "undefined" && typeof project !== "string") {
    errors.push(
      `\n --project must be of type 'string', ${typeof project} specified.`
    );
  }

  if (
    typeof personalAccessToken !== "undefined" &&
    typeof personalAccessToken !== "string"
  ) {
    errors.push(
      `\n --personal-access-token must be of type 'string', ${typeof personalAccessToken} specified.`
    );
  }

  return errors;
};
