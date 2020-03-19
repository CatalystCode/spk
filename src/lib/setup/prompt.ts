import fs from "fs";
import inquirer from "inquirer";
import {
  validateAccessToken,
  validateACRName,
  validateOrgName,
  validateProjectName,
  validateServicePrincipalId,
  validateServicePrincipalPassword,
  validateServicePrincipalTenantId,
  validateSubscriptionId
} from "../validator";
import {
  ACR_NAME,
  DEFAULT_PROJECT_NAME,
  HLD_REPO,
  RequestContext,
  WORKSPACE
} from "./constants";
import { getAzureRepoUrl } from "./gitService";
import {
  azCLILogin,
  createWithAzCLI,
  SubscriptionData
} from "./servicePrincipalService";
import { getSubscriptions, SubscriptionItem } from "./subscriptionService";

export const promptForSubscriptionId = async (
  subscriptions: SubscriptionItem[] | SubscriptionData[]
): Promise<string | undefined> => {
  const questions = [
    {
      choices: subscriptions.map(s => s.name),
      message: "Select one of the subscriptions\n",
      name: "az_subscription",
      type: "list"
    }
  ];
  const ans = await inquirer.prompt(questions);
  const found = subscriptions.find(
    s => s.name === (ans.az_subscription as string)
  );
  return found ? found.id : undefined;
};

export const getSubscriptionId = async (rc: RequestContext): Promise<void> => {
  const subscriptions = await getSubscriptions(rc);
  if (subscriptions.length === 0) {
    throw Error("no subscriptions found");
  }
  if (subscriptions.length === 1) {
    rc.subscriptionId = subscriptions[0].id;
  } else {
    const subId = await promptForSubscriptionId(subscriptions);
    if (!subId) {
      throw Error("Subscription Identifier is missing.");
    }
    rc.subscriptionId = subId;
  }
};

/**
 * Prompts for service principal identifer, password and tenant identifer.
 * Request context will have the service principal information
 * when this function is completed successfully.
 *
 * @param rc Request Context
 */
export const promptForServicePrincipal = async (
  rc: RequestContext
): Promise<void> => {
  const questions = [
    {
      message: "Enter Service Principal Id\n",
      name: "az_sp_id",
      type: "input",
      validate: validateServicePrincipalId
    },
    {
      mask: "*",
      message: "Enter Service Principal Password\n",
      name: "az_sp_password",
      type: "password",
      validate: validateServicePrincipalPassword
    },
    {
      message: "Enter Service Principal Tenant Id\n",
      name: "az_sp_tenant",
      type: "input",
      validate: validateServicePrincipalTenantId
    }
  ];
  const answers = await inquirer.prompt(questions);
  rc.servicePrincipalId = answers.az_sp_id as string;
  rc.servicePrincipalPassword = answers.az_sp_password as string;
  rc.servicePrincipalTenantId = answers.az_sp_tenant as string;
};

/**
 * Prompts for ACR name, default value is "quickStartACR".
 * This is needed bacause ACR name has to be unique within Azure.
 *
 * @param rc Request Context
 */
export const promptForACRName = async (rc: RequestContext): Promise<void> => {
  const questions = [
    {
      default: ACR_NAME,
      message: `Enter Azure Container Register Name. The registry name must be unique within Azure\n`,
      name: "acr_name",
      type: "input",
      validate: validateACRName
    }
  ];
  const answers = await inquirer.prompt(questions);
  rc.acrName = answers.acr_name as string;
};

/**
 * Prompts for creating service principal. User can choose
 * Yes or No.
 *
 * @param rc Request Context
 */
export const promptForServicePrincipalCreation = async (
  rc: RequestContext
): Promise<void> => {
  const questions = [
    {
      default: true,
      message: `Do you want to create a service principal?`,
      name: "create_service_principal",
      type: "confirm"
    }
  ];
  const answers = await inquirer.prompt(questions);
  if (answers.create_service_principal) {
    rc.toCreateSP = true;
    const subscriptions = await azCLILogin();
    const subscriptionId = await promptForSubscriptionId(subscriptions);
    if (!subscriptionId) {
      throw Error("Subscription Identifier is missing.");
    }
    rc.subscriptionId = subscriptionId;
    await createWithAzCLI(rc);
  } else {
    rc.toCreateSP = false;
    await promptForServicePrincipal(rc);
    await getSubscriptionId(rc);
  }
};

/**
 * Prompts for questions
 *
 * @return answers to the questions
 */
export const prompt = async (): Promise<RequestContext> => {
  const questions = [
    {
      message: "Enter organization name\n",
      name: "azdo_org_name",
      type: "input",
      validate: validateOrgName
    },
    {
      default: DEFAULT_PROJECT_NAME,
      message: "Enter name of project to be created\n",
      name: "azdo_project_name",
      type: "input",
      validate: validateProjectName
    },
    {
      mask: "*",
      message: "Enter your Azure DevOps personal access token\n",
      name: "azdo_pat",
      type: "password",
      validate: validateAccessToken
    },
    {
      default: true,
      message: "Would you like to create a sample application repository?",
      name: "create_app_repo",
      type: "confirm"
    }
  ];
  const answers = await inquirer.prompt(questions);
  const rc: RequestContext = {
    accessToken: answers.azdo_pat as string,
    orgName: answers.azdo_org_name as string,
    projectName: answers.azdo_project_name as string,
    toCreateAppRepo: answers.create_app_repo as boolean,
    workspace: WORKSPACE
  };

  if (rc.toCreateAppRepo) {
    await promptForServicePrincipalCreation(rc);
    await promptForACRName(rc);
  }
  return rc;
};

const validationServicePrincipalInfoFromFile = (
  rc: RequestContext,
  map: { [key: string]: string }
): void => {
  if (rc.toCreateAppRepo) {
    rc.toCreateSP = map.az_create_sp === "true";

    // file needs to contain sp information if user
    // choose not to create SP
    if (!rc.toCreateSP) {
      const vSPId = validateServicePrincipalId(map.az_sp_id);
      if (typeof vSPId === "string") {
        throw new Error(vSPId);
      }
      const vSPPassword = validateServicePrincipalPassword(map.az_sp_password);
      if (typeof vSPPassword === "string") {
        throw new Error(vSPPassword);
      }
      const vSPTenantId = validateServicePrincipalTenantId(map.az_sp_tenant);
      if (typeof vSPTenantId === "string") {
        throw new Error(vSPTenantId);
      }
    }

    const vSubscriptionId = validateSubscriptionId(map.az_subscription_id);
    if (typeof vSubscriptionId === "string") {
      throw new Error(vSubscriptionId);
    }
    rc.subscriptionId = map.az_subscription_id;
  }
};

const parseInformationFromFile = (file: string): { [key: string]: string } => {
  let content = "";
  try {
    content = fs.readFileSync(file, "utf-8");
  } catch (_) {
    throw new Error(
      `${file} did not exist or not accessible. Make sure that it is accessible.`
    );
  }

  const arr = content.split("\n").filter(s => s.trim().length > 0);
  const map: { [key: string]: string } = {};
  arr.forEach(s => {
    const idx = s.indexOf("=");
    if (idx !== -1) {
      map[s.substring(0, idx).trim()] = s.substring(idx + 1).trim();
    }
  });
  return map;
};

/**
 * Returns answers that are provided in a file.
 *
 * @param file file name
 */
export const getAnswerFromFile = (file: string): RequestContext => {
  const map = parseInformationFromFile(file);
  map["azdo_project_name"] = map.azdo_project_name || DEFAULT_PROJECT_NAME;

  const vOrgName = validateOrgName(map.azdo_org_name);
  if (typeof vOrgName === "string") {
    throw new Error(vOrgName);
  }

  const vProjectName = validateProjectName(map.azdo_project_name);
  if (typeof vProjectName === "string") {
    throw new Error(vProjectName);
  }

  const vToken = validateAccessToken(map.azdo_pat);
  if (typeof vToken === "string") {
    throw new Error(vToken);
  }

  const rc: RequestContext = {
    accessToken: map.azdo_pat,
    orgName: map.azdo_org_name,
    projectName: map.azdo_project_name,
    servicePrincipalId: map.az_sp_id,
    servicePrincipalPassword: map.az_sp_password,
    servicePrincipalTenantId: map.az_sp_tenant,
    acrName: map.az_acr_name || ACR_NAME,
    workspace: WORKSPACE
  };

  rc.toCreateAppRepo = map.az_create_app === "true";
  validationServicePrincipalInfoFromFile(rc, map);

  return rc;
};

export const promptForApprovingHLDPullRequest = async (
  rc: RequestContext
): Promise<boolean> => {
  const urlPR = `${getAzureRepoUrl(
    rc.orgName,
    rc.projectName,
    HLD_REPO
  )}/pullrequest`;
  const questions = [
    {
      default: true,
      message: `Please approve and merge a PR at ${urlPR}? Refresh the page after a while if you do not see active PR.`,
      name: "approve_hld_pr",
      type: "confirm"
    }
  ];
  const answers = await inquirer.prompt(questions);
  return !!answers.approve_hld_pr;
};
