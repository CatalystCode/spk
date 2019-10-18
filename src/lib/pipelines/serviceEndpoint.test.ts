import * as path from "path";
import { Config, loadConfiguration } from "../../config";
import { IConfigYaml } from "../../types";
import * as serviceEndpoint from "./serviceEndpoint";

const mockServiceEndpointId: string = "mock-service-endpoint-id";
const mockServiceEndpointName: string = "mock-service_endpoint-name";

jest.spyOn(serviceEndpoint, "getServiceEndpointByName").mockImplementation(
  async (): Promise<any> => {
    return undefined;
  }
);

let config: IConfigYaml;
beforeEach(() => {
  process.env.test_name = "my_storage_account";
  process.env.test_key = "my_storage_key";
  const mockFileName = "src/commands/mocks/spk-config.yaml";
  const filename = path.resolve(mockFileName);
  loadConfiguration(filename);
  config = Config();
});

describe("Validate service endpoint endpoint", () => {
  test("valid service endpoint params", async () => {
    const serviceEndpointConfig = Config().azure_devops!.variable_group!
      .key_vault_provider!.service_endpoint;

    const data = await serviceEndpoint.createServiceEndPointParams(
      serviceEndpointConfig
    );

    expect(data.name).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!.service_endpoint
        .name
    );

    expect(data.type).toBe("azurerm");

    expect(data.data.subscriptionId).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!.service_endpoint
        .subscription_id
    );

    expect(data.data.subscriptionName).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!.service_endpoint
        .subscription_name
    );

    expect(data.authorization.parameters.serviceprincipalid).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!.service_endpoint
        .service_principal_id
    );

    expect(data.authorization.parameters.serviceprincipalkey).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!.service_endpoint
        .service_principal_secret
    );

    expect(data.authorization.parameters.tenantid).toBe(
      config.azure_devops!.variable_group!.key_vault_provider!.service_endpoint
        .tenant_id
    );

    expect(data.authorization.parameters.authenticationType).toBe("spnKey");

    expect(data.authorization.scheme).toBe("ServicePrincipal");
  });
});
