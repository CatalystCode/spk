import {
  ContainerRegistryManagementClientOptions,
  RegistriesCreateResponse,
  Registry
} from "@azure/arm-containerregistry/src/models";
import { RequestOptionsBase } from "@azure/ms-rest-js";
import { ApplicationTokenCredentials } from "@azure/ms-rest-nodeauth";

import * as restAuth from "@azure/ms-rest-nodeauth";
import {
  create,
  getContainerRegistries,
  isExist
} from "./azureContainerRegistryService";
import * as azureContainerRegistryService from "./azureContainerRegistryService";
import { IRequestContext, RESOURCE_GROUP } from "./constants";

jest.mock("@azure/arm-containerregistry", () => {
  class MockClient {
    constructor(
      cred: ApplicationTokenCredentials,
      subscriptionId: string,
      options?: ContainerRegistryManagementClientOptions
    ) {
      return {
        registries: {
          create: async (
            resourceGroupName: string,
            registryName: string,
            registry: Registry,
            opts?: RequestOptionsBase
          ): Promise<RegistriesCreateResponse> => {
            return {} as any;
          },
          list: () => {
            return [
              {
                id:
                  "/subscriptions/dd831253-787f-4dc8-8eb0-ac9d052177d9/resourceGroups/bedrockSPK/providers/Microsoft.ContainerRegistry/registries/acrWest",
                name: "acrWest"
              }
            ];
          }
        }
      };
    }
  }
  return {
    ContainerRegistryManagementClient: MockClient
  };
});

const mockRequestContext: IRequestContext = {
  accessToken: "pat",
  orgName: "org",
  projectName: "project",
  servicePrincipalId: "1eba2d04-1506-4278-8f8c-b1eb2fc462a8",
  servicePrincipalPassword: "e4c19d72-96d6-4172-b195-66b3b1c36db1",
  servicePrincipalTenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
  subscriptionId: "test",
  workspace: "test"
};

describe("test container registries function", () => {
  it("negative test", async () => {
    jest
      .spyOn(restAuth, "loginWithServicePrincipalSecret")
      .mockImplementationOnce(() => {
        throw Error("fake");
      });
    await expect(getContainerRegistries(mockRequestContext)).rejects.toThrow();
  });
  it("positive test: one value", async () => {
    jest
      .spyOn(restAuth, "loginWithServicePrincipalSecret")
      .mockImplementationOnce(async () => {
        return {};
      });
    const result = await getContainerRegistries(mockRequestContext);
    expect(result).toStrictEqual([
      {
        id:
          "/subscriptions/dd831253-787f-4dc8-8eb0-ac9d052177d9/resourceGroups/bedrockSPK/providers/Microsoft.ContainerRegistry/registries/acrWest",
        name: "acrWest",
        resourceGroup: "bedrockSPK"
      }
    ]);
  });
  it("cache test", async () => {
    const fnAuth = jest.spyOn(restAuth, "loginWithServicePrincipalSecret");
    fnAuth.mockReset();
    await getContainerRegistries(mockRequestContext);
    expect(fnAuth).toBeCalledTimes(0);
  });
  it("isExist: group already exist", async () => {
    jest
      .spyOn(azureContainerRegistryService, "getContainerRegistries")
      .mockResolvedValueOnce([
        {
          id: "fakeId",
          name: "test",
          resourceGroup: RESOURCE_GROUP
        }
      ]);
    const res = await isExist(mockRequestContext, RESOURCE_GROUP, "test");
    expect(res).toBeTruthy();
  });
  it("isExist: no groups", async () => {
    jest
      .spyOn(azureContainerRegistryService, "getContainerRegistries")
      .mockResolvedValueOnce([]);
    const res = await isExist(mockRequestContext, RESOURCE_GROUP, "test");
    expect(res).toBeFalsy();
  });
  it("isExist: group does not exist", async () => {
    jest
      .spyOn(azureContainerRegistryService, "getContainerRegistries")
      .mockResolvedValueOnce([
        {
          id: "fakeId",
          name: "test1",
          resourceGroup: RESOURCE_GROUP
        }
      ]);
    const res = await isExist(mockRequestContext, RESOURCE_GROUP, "test");
    expect(res).toBeFalsy();
  });
  it("create: positive test: acr already exist", async () => {
    jest
      .spyOn(azureContainerRegistryService, "isExist")
      .mockResolvedValueOnce(true);
    const created = await create(mockRequestContext);
    expect(created).toBeFalsy();
  });
  it("create: positive test: acr did not exist", async () => {
    jest
      .spyOn(azureContainerRegistryService, "isExist")
      .mockResolvedValueOnce(false);
    const created = await create(mockRequestContext);
    expect(created).toBeTruthy();
  });
});
