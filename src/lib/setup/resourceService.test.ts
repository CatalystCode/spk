import {
  ResourceGroup,
  ResourceGroupsCreateOrUpdateResponse,
  ResourceManagementClientOptions
} from "@azure/arm-resources/src/models";
import { RequestOptionsBase } from "@azure/ms-rest-js";
import { ApplicationTokenCredentials } from "@azure/ms-rest-nodeauth";
import * as restAuth from "@azure/ms-rest-nodeauth";
import { IRequestContext, RESOURCE_GROUP_LOCATION } from "./constants";
import { create, getResourceGroups, isExist } from "./resourceService";
import * as resourceService from "./resourceService";

jest.mock("@azure/arm-resources", () => {
  class MockClient {
    constructor(
      cred: ApplicationTokenCredentials,
      subscriptionId: string,
      options?: ResourceManagementClientOptions
    ) {
      return {
        resourceGroups: {
          createOrUpdate: async (
            resourceGroupName: string,
            parameters: ResourceGroup,
            options?: RequestOptionsBase
          ): Promise<ResourceGroupsCreateOrUpdateResponse> => {
            return {} as any;
          },
          list: () => {
            return [
              {
                id: "1234567890-abcdef",
                location: RESOURCE_GROUP_LOCATION,
                name: "test"
              }
            ];
          }
        }
      };
    }
  }
  return {
    ResourceManagementClient: MockClient
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

describe("Resource Group tests", () => {
  it("getResourceGroups: negative test", async () => {
    jest
      .spyOn(restAuth, "loginWithServicePrincipalSecret")
      .mockImplementationOnce(() => {
        throw Error("fake");
      });
    await expect(getResourceGroups(mockRequestContext)).rejects.toThrow();
  });
  it("getResourceGroups: positive test: one value", async () => {
    jest
      .spyOn(restAuth, "loginWithServicePrincipalSecret")
      .mockImplementationOnce(async () => {
        return {};
      });
    const result = await getResourceGroups(mockRequestContext);
    expect(result).toStrictEqual([
      {
        id: "1234567890-abcdef",
        location: RESOURCE_GROUP_LOCATION,
        name: "test"
      }
    ]);
  });
  it("getResourceGroups: cache test", async () => {
    const fnAuth = jest.spyOn(restAuth, "loginWithServicePrincipalSecret");
    fnAuth.mockReset();
    await getResourceGroups(mockRequestContext);
    expect(fnAuth).toBeCalledTimes(0);
  });
  it("isExist: group already exist", async () => {
    jest.spyOn(resourceService, "getResourceGroups").mockResolvedValueOnce([
      {
        id: "fakeId",
        location: RESOURCE_GROUP_LOCATION,
        name: "test"
      }
    ]);
    const res = await isExist(mockRequestContext, "test");
    expect(res).toBeTruthy();
  });
  it("isExist: no groups", async () => {
    jest.spyOn(resourceService, "getResourceGroups").mockResolvedValueOnce([]);
    const res = await isExist(mockRequestContext, "test");
    expect(res).toBeFalsy();
  });
  it("isExist: group does not exist", async () => {
    jest.spyOn(resourceService, "getResourceGroups").mockResolvedValueOnce([
      {
        id: "fakeId",
        location: RESOURCE_GROUP_LOCATION,
        name: "test1"
      }
    ]);
    const res = await isExist(mockRequestContext, "test");
    expect(res).toBeFalsy();
  });
  it("create: positive test: group already exist", async () => {
    jest.spyOn(resourceService, "isExist").mockResolvedValueOnce(true);
    const created = await create(mockRequestContext);
    expect(created).toBeFalsy();
  });
  it("create: positive test: group did not exist", async () => {
    jest.spyOn(resourceService, "isExist").mockResolvedValueOnce(false);
    const created = await create(mockRequestContext);
    expect(created).toBeTruthy();
  });
});
