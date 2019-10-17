import * as path from "path";
import { config, loadConfiguration } from "../../commands/init";
import * as serviceConnection from "./serviceConnection";

const mockServiceConnectionId: string = "mock-service-endpoint-id";
const mockServiceConnectionName: string = "mock-service_connection-name";

jest.spyOn(serviceConnection, "getServiceConnectionByName").mockImplementation(
  async (): Promise<any> => {
    return undefined;
  }
);

beforeEach(() => {
  process.env.test_name = "my_storage_account";
  process.env.test_key = "my_storage_key";
  const mockFileName = "src/commands/mocks/spk-config.yaml";
  const filename = path.resolve(mockFileName);
  loadConfiguration(filename);
});

describe("Validate service connection endpoint", () => {
  test("valid service endpoint params", async () => {
    const serviceConnectionConfig = config.azure_devops!.variable_group!
      .key_vault_provider!.service_connection;

    const data = await serviceConnection.createServiceEndPointParams(
      serviceConnectionConfig
    );

    expect(data.name).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!
        .service_connection.name
    );

    expect(data.type).toBe("azurerm");

    expect(data.data.subscriptionId).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!
        .service_connection.subscription_id
    );

    expect(data.data.subscriptionName).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!
        .service_connection.subscription_name
    );

    expect(data.authorization.parameters.serviceprincipalid).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!
        .service_connection.service_principal_id
    );

    expect(data.authorization.parameters.serviceprincipalkey).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!
        .service_connection.service_principal_secret
    );

    expect(data.authorization.parameters.tenantid).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!
        .service_connection.tenant_id
    );

    expect(data.authorization.parameters.authenticationType).toBe("spnKey");

    expect(data.authorization.scheme).toBe("ServicePrincipal");
  });
});
