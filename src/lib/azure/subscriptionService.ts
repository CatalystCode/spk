/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SubscriptionClient } from "@azure/arm-subscriptions";
import {
  ApplicationTokenCredentials,
  loginWithServicePrincipalSecret
} from "@azure/ms-rest-nodeauth";
import { logger } from "../../logger";

export interface SubscriptionItem {
  id: string;
  name: string;
}

/**
 * Returns a list of subscriptions based on the service principal credentials.
 *
 * @param servicePrincipalId Service Principal Id
 * @param servicePrincipalPassword Service Principal Password
 * @param servicePrincipalTenantId  Service Principal TenantId
 */
export const getSubscriptions = (
  servicePrincipalId: string,
  servicePrincipalPassword: string,
  servicePrincipalTenantId: string
): Promise<SubscriptionItem[]> => {
  logger.info("attempting to get subscription list");
  return new Promise((resolve, reject) => {
    loginWithServicePrincipalSecret(
      servicePrincipalId!,
      servicePrincipalPassword!,
      servicePrincipalTenantId!
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
        logger.info("Successfully acquired subscription list");
        resolve(result);
      })
      .catch(err => {
        reject(err);
      });
  });
};