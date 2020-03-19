import * as shell from "../shell";
import { RequestContext, WORKSPACE } from "./constants";
import { azCLILogin, createWithAzCLI } from "./servicePrincipalService";

describe("test azCLILogin function", () => {
  it("positive test", async () => {
    jest.spyOn(shell, "exec").mockResolvedValueOnce(
      JSON.stringify([
        {
          id: "subid",
          name: "subname"
        }
      ])
    );
    await azCLILogin();
  });
  it("negative test", async () => {
    jest.spyOn(shell, "exec").mockRejectedValueOnce(Error("fake"));
    await expect(azCLILogin()).rejects.toThrow();
  });
});

describe("test createWithAzCLI function", () => {
  it("positive test", async () => {
    const result = {
      appId: "b510c1ff-358c-4ed4-96c8-eb23f42bb65b",
      password: "a510c1ff-358c-4ed4-96c8-eb23f42bbc5b",
      tenant: "72f988bf-86f1-41af-91ab-2d7cd011db47"
    };
    jest.spyOn(shell, "exec").mockResolvedValueOnce(JSON.stringify(result));
    const rc: RequestContext = {
      accessToken: "pat",
      orgName: "orgName",
      projectName: "project",
      workspace: WORKSPACE
    };
    await createWithAzCLI(rc);
    expect(rc.createServicePrincipal).toBeTruthy();
    expect(rc.servicePrincipalPassword).toBe(result.password);
    expect(rc.servicePrincipalTenantId).toBe(result.tenant);
  });
  it("negative test", async () => {
    jest.spyOn(shell, "exec").mockRejectedValueOnce(Error("fake"));
    const rc: RequestContext = {
      accessToken: "pat",
      orgName: "orgName",
      projectName: "project",
      workspace: WORKSPACE
    };
    await expect(createWithAzCLI(rc)).rejects.toThrow();
  });
});
