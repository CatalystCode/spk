import inquirer from "inquirer";
import { createStorage, createStorageAccount } from "./azureStorage";
import * as azureStorage from "./azureStorage";
import { RequestContext } from "./constants";
import * as azure from "../azure/storage";

describe("test createStorage function", () => {
  it("positive test", async () => {
    jest
      .spyOn(azureStorage, "createStorageAccount")
      .mockResolvedValueOnce(true);
    const rc: RequestContext = {
      orgName: "notUsed",
      projectName: "notUsed",
      accessToken: "notUsed",
      workspace: "notUsed"
    };
    await createStorage(rc);
    expect(rc.createdStorageAccount).toBe(true);
  });
  it("positive test: name used", async () => {
    jest
      .spyOn(azureStorage, "createStorageAccount")
      .mockResolvedValueOnce(undefined);
    jest
      .spyOn(azureStorage, "createStorageAccount")
      .mockResolvedValueOnce(true);
    jest.spyOn(inquirer, "prompt").mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/camelcase
      azdo_storage_account_name: "teststore"
    });
    const rc: RequestContext = {
      orgName: "notUsed",
      projectName: "notUsed",
      accessToken: "notUsed",
      workspace: "notUsed"
    };
    await createStorage(rc);
    expect(rc.createdStorageAccount).toBe(true);
    expect(rc.storageAccountName).toBe("teststore");
  });
});

describe("test createStorageAccount function", () => {
  it("positive test: account already exist", async () => {
    jest.spyOn(azure, "isStorageAccountExist").mockResolvedValueOnce(true);
    const result = await createStorageAccount("temp");
    expect(result).toBeFalsy();
  });
  it("positive test: account doe not exist", async () => {
    jest.spyOn(azure, "isStorageAccountExist").mockResolvedValueOnce(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(azure, "createStorageAccount").mockResolvedValueOnce({} as any);

    const result = await createStorageAccount("temp");
    expect(result).toBeTruthy();
  });
  it("negative test", async () => {
    jest.spyOn(azure, "isStorageAccountExist").mockResolvedValueOnce(false);
    jest
      .spyOn(azure, "createStorageAccount")
      .mockRejectedValueOnce(Error("fake"));

    const result = await createStorageAccount("temp");
    expect(result).toBeUndefined();
  });
});
