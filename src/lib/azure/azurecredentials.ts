import { ClientSecretCredential } from "@azure/identity";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";

const AZURE_TENANT_ID = "";
const AZURE_CLIENT_ID = "";
const AZURE_CLIENT_SECRET = "";
export const AZURE_SUBSCRIPTION_ID = "";

/**
 * Create an instance of `ClientSecretCredential` and returns for Azure data plane activities
 */
export const getCredentials = async (): Promise<ClientSecretCredential> => {
  return new ClientSecretCredential(
    AZURE_TENANT_ID,
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET
  );
};

/**
 * Create an instance of `ApplicationTokenCredentials` and returns for Azure Control/Management plane activities
 */
export const getManagementCredentials = async (): Promise<
  msRestNodeAuth.ApplicationTokenCredentials
> => {
  return msRestNodeAuth.loginWithServicePrincipalSecret(
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET,
    AZURE_TENANT_ID
  );
};
