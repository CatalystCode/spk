import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import { parse_variables_tf, generate_cluster_definition } from "./scaffold";

beforeAll(() => {
  enableVerboseLogging();
  jest.setTimeout(30000);
});

afterAll(() => {
  disableVerboseLogging();
  jest.setTimeout(5000);
});

describe("Validate parsing of sample variables.tf file", () => {
  test("Validate that a variables.tf sample can be parsed into an object", async () => {
    const sampleVarTf =
      'variable "resource_group_name" { \n' +
      '   type = "string"\n' +
      "} \n" +
      "\n" +
      'variable "service_principal_secret" { \n' +
      '    type = "string"\n' +
      "} \n" +
      "\n" +
      'variable "gitops_poll_interval" { \n' +
      '   type    = "string"\n' +
      '    default = "5m"\n' +
      "} \n";
    const fields: { [name: string]: string | null } = parse_variables_tf(
      sampleVarTf
    );
    expect(Object.keys(fields).length).toBe(3);
    expect(fields.resource_group_name).toBe(null);
    expect(fields.gitops_poll_interval).toBe("5m");
  });
});

describe("Validate generation of sample scaffold definition", () => {
  test("Validate that a valid scaffold definition object is generated", async () => {
    const sampleVarTf =
      'variable "resource_group_name" { \n' +
      '   type = "string"\n' +
      "} \n" +
      "\n" +
      'variable "service_principal_secret" { \n' +
      '    type = "string"\n' +
      "} \n" +
      "\n" +
      'variable "gitops_poll_interval" { \n' +
      '   type    = "string"\n' +
      '    default = "5m"\n' +
      "} \n";
    const def = generate_cluster_definition(
      "test-scaffold",
      "https://github.com/microsoft/bedrock",
      "v1.0.0",
      sampleVarTf
    );
    expect(def.name).toBe("test-scaffold");
    expect(def.variables.resource_group_name).toBe("<insert value>");
  });
});
