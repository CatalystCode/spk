import * as path from "path";
import { config, loadConfiguration } from "../../commands/init";
import { logger } from "../../logger";
import * as serviceConnection from "./serviceConnection";

jest.spyOn(serviceConnection, "getServiceConnectionByName").mockImplementation(
  async (): Promise<any> => {
    return undefined;
  }
);

// jest.spyOn(serviceConnection, "createServiceEndPointData").mockImplementation(
//   async (
//     serviceConnectionConfig: IServiceConnectionConfiguration
//   ): Promise<JSON> => {
//     if (serviceConnectionConfig.name === "mock-test") {
//       const endPointData: any = {
//         authorization: {
//           parameters: {
//             authenticationType: "spnKey",
//             serviceprincipalid: serviceConnectionConfig.service_principal_id,
//             serviceprincipalkey:
//               serviceConnectionConfig.service_principal_secret,
//             tenantid: serviceConnectionConfig.tenant_id
//           },
//           scheme: "ServicePrincipal"
//         },
//         data: {
//           subscriptionId: serviceConnectionConfig.subscription_id,
//           subscriptionName: serviceConnectionConfig.subscription_name
//         },
//         id: generateUuid(),
//         isReady: false,
//         name: serviceConnectionConfig.name,
//         type: "azurerm"
//       };

//       return endPointData;
//     }
//     const ret: any = {};
//     return ret as JSON;
//   }
// );

// let serviceConnectionParams: JSON;

beforeEach(() => {
  process.env.test_name = "my_storage_account";
  process.env.test_key = "my_storage_key";
  const mockFileName = "src/commands/mocks/spk-config.yaml";
  const filename = path.resolve(mockFileName);
  loadConfiguration(filename);
});

describe("Validate service endpoint params", () => {
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

    logger.info(`validated service endpoint create parameters`);
  });
});
