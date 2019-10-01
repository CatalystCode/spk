import { logger } from "../../logger";
import { getCredentials } from "./azurecredentials";
import { SecretsClient } from "@azure/keyvault-secrets";

/**
 * Create or update the secret `secretName` in Azure Key Vault `keyVaultName`
 *
 * @param keyVaultName The Azure key vault name
 * @param secretName Name of the secret
 * @param secretValue Value of the secret
 */
export const setSecret = async (
  keyVaultName: string,
  secretName: string,
  secretValue: string
) => {
  const url = `https://${keyVaultName}.vault.azure.net`;
  const message = `secret ${secretName} with a value ${secretValue} in key vault ${keyVaultName}`;
  try {
    const credentials = await getCredentials();
    const client = new SecretsClient(url, credentials);

    // Create a secret
    logger.info(`Setting ${message}`);
    const result = await client.setSecret(secretName, secretValue);
    logger.info(`Set ${message}`);
  } catch (err) {
    logger.error(`Unable to set ${message}`);
    logger.error(err);
  }
};

/**
 * Gets the secret `secretName` value from Azure key vault `name` and returns the value `Promise<string>`
 *
 * @param name The Azure key vault name
 * @param secretName Name of the secret
 */
export const getSecret = async (
  keyVaultName: string,
  secretName: string
): Promise<string | undefined> => {
  const url = `https://${keyVaultName}.vault.azure.net`;
  const message = `secret ${secretName} from key vault ${keyVaultName}`;
  try {
    var credentials = await getCredentials();
    const client = new SecretsClient(url, credentials);

    // Get the secret
    logger.info(`Getting ${message}`);
    const secret = await client.getSecret(secretName);
    logger.info(`Found ${message} and the value is ${secret.value}`);
    return secret.value;
  } catch (err) {
    logger.error(`Unable to read ${message}`);
    logger.error(err);
  }
};
