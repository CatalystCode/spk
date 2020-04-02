// please do not change the status code numbers
// you can add new ones but not changing the existing ones

export enum errorStatusCode {
  CMD_EXE_ERR = 1000,
  VALIDATION_ERR = 1001,
  EXE_FLOW_ERR = 1002,
  ENV_SETTING_ERR = 1010,
  FILE_IO_ERR = 1011,
  INCORRECT_DEFINITION = 1012,
  GIT_OPS_ERR = 1100,
  AZURE_PROJECT_ERR = 1200,
  PIPELINE_ERR = 1500,
  AZURE_STORAGE_OP_ERR = 2000,
  AZURE_RESOURCE_GROUP_ERR = 2500,
  AZURE_VARIABLE_GROUP_ERR = 2600,
  DOCKER_ERR = 3000,
}
