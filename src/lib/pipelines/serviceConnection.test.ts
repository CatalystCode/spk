import { generateUuid } from "@azure/core-http";
import * as path from "path";
import { config, loadConfiguration } from "../../commands/init";
import { getConfig } from "../../config";
import { logger } from "../../logger";
import { IServiceConnectionConfiguration } from "../../types";
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
  // const config = getConfig();
  const mockFileName = "./spk-config.yaml";
  const filename = path.resolve(mockFileName);
  loadConfiguration(filename);
});

describe("Validate service endpoint data", () => {
  test("valid service endpoint data", async () => {
    logger.debug(`config: ${JSON.stringify(config)}`);
    const serviceConnectionConfig = config.azure_devops!.variable_group!
      .key_vault_provider!.service_connection;
    const data = serviceConnection.createServiceEndPointParams(
      serviceConnectionConfig
    );

    expect(data).toBeDefined();
    logger.info(`validated service endpoint data`);
  });
});
