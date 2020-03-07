import { logger } from "../../logger";
import { exec } from "../shell";
import { IRequestContext } from "./constants";

export const azCLILogin = async () => {
  try {
    logger.info("attempting to login to az command line");
    await exec("az", ["login"]);
    logger.info("Successfully login to az command line");
  } catch (err) {
    logger.error("Unable to execute az login");
    logger.error(err);
    throw err;
  }
};

export const createWithAzCLI = async (rc: IRequestContext) => {
  await azCLILogin();
  try {
    logger.info("attempting to create service principal with az command line");
    const result = await exec("az", ["ad", "sp", "create-for-rbac"]);
    const oResult = JSON.parse(result);
    rc.createServicePrincipal = true;
    rc.servicePrincipalId = oResult.appId;
    rc.servicePrincipalPassword = oResult.password;
    rc.servicePrincipalTenantId = oResult.tenant;
    logger.info("Successfully created service principal with az command line");
  } catch (err) {
    logger.error("Unable to create service principal with az command line");
    logger.error(err);
    throw err;
  }
};
