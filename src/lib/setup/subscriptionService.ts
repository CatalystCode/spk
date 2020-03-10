import { SubscriptionClient } from "@azure/arm-subscriptions";
import {
  ApplicationTokenCredentials,
  loginWithServicePrincipalSecret
} from "@azure/ms-rest-nodeauth";
import { logger } from "../../logger";
import { IRequestContext } from "./constants";

export interface ISubscriptionItem {
  id: string;
  name: string;
}

/**
 * Returns a list of subscriptions based on the service principal credentials.
 *
 * @param rc Request Context
 */
export const getSubscriptions = (
  rc: IRequestContext
): Promise<ISubscriptionItem[]> => {
  logger.info("attempting to get subscription list");
  return new Promise((resolve, reject) => {
    loginWithServicePrincipalSecret(
      rc.servicePrincipalId!,
      rc.servicePrincipalPassword!,
      rc.servicePrincipalTenantId!
    )
      .then(async (creds: ApplicationTokenCredentials) => {
        const client = new SubscriptionClient(creds);
        const subsciptions = await client.subscriptions.list();
        const result = (subsciptions || []).map(s => {
          return {
            id: s.subscriptionId!,
            name: s.displayName!
          };
        });
        logger.info("Successfully acquored subscription list");
        resolve(result);
      })
      .catch(err => {
        reject(err);
      });
  });
};
