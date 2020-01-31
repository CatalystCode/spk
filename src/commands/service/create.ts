import commander from "commander";
import path from "path";
import shelljs from "shelljs";
import { Bedrock } from "../../config";
import {
  addNewService as addNewServiceToBedrockFile,
  fileInfo as bedrockFileInfo,
  YAML_NAME as BedrockFileName
} from "../../lib/bedrockYaml";
import { build as buildCmd, exit as exitCmd } from "../../lib/commandBuilder";
import {
  projectCvgDependencyErrorMessage,
  projectInitCvgDependencyErrorMessage
} from "../../lib/constants";
import {
  addNewServiceToMaintainersFile,
  generateDockerfile,
  generateGitIgnoreFile,
  generateStarterAzurePipelinesYaml
} from "../../lib/fileutils";
import { checkoutCommitPushCreatePRLink } from "../../lib/gitutils";
import { isPortNumberString } from "../../lib/validator";
import { logger } from "../../logger";
import { IBedrockFileInfo, IHelmConfig, IUser } from "../../types";
import decorator from "./create.decorator.json";

export interface ICommandOptions {
  displayName: string;
  gitPush: boolean;
  helmChartChart: string;
  helmChartRepository: string;
  helmConfigBranch: string;
  helmConfigGit: string;
  helmConfigPath: string;
  k8sBackend: string;
  maintainerEmail: string;
  maintainerName: string;
  middlewares: string;
  packagesDir: string;
  pathPrefix: string;
  pathPrefixMajorVersion: string;
  k8sBackendPort: string;
}

export interface ICommandValues extends ICommandOptions {
  k8sPort: number;
  middlewaresArray: string[];
  variableGroups: string[];
}

export const fetchValues = (opts: ICommandOptions) => {
  if (!isPortNumberString(opts.k8sBackendPort)) {
    throw new Error("value for --k8s-service-port is not a valid port number");
  }

  let variableGroups: string[] = [];

  const bedrock = Bedrock();
  variableGroups = bedrock.variableGroups || [];

  let middlewaresArray: string[] = [];
  if (opts.middlewares && opts.middlewares.trim()) {
    middlewaresArray = opts.middlewares.split(",").map(str => str.trim());
  }

  const values: ICommandValues = {
    displayName: opts.displayName,
    gitPush: opts.gitPush,
    helmChartChart: opts.helmChartChart,
    helmChartRepository: opts.helmChartRepository,
    helmConfigBranch: opts.helmConfigBranch,
    helmConfigGit: opts.helmConfigGit,
    helmConfigPath: opts.helmConfigPath,
    k8sBackend: opts.k8sBackend,
    k8sBackendPort: opts.k8sBackendPort,
    k8sPort: parseInt(opts.k8sBackendPort, 10),
    maintainerEmail: opts.maintainerEmail,
    maintainerName: opts.maintainerName,
    middlewares: opts.middlewares,
    middlewaresArray,
    packagesDir: opts.packagesDir,
    pathPrefix: opts.pathPrefix,
    pathPrefixMajorVersion: opts.pathPrefixMajorVersion,
    variableGroups
  };

  // Values do not need to be validated
  // as they are mostly provided by Commander.
  return values;
};

export const checkDependencies = (projectPath: string) => {
  const fileInfo: IBedrockFileInfo = bedrockFileInfo(projectPath);
  if (fileInfo.exist === false) {
    throw new Error(projectInitCvgDependencyErrorMessage);
  } else if (fileInfo.hasVariableGroups === false) {
    throw new Error(projectCvgDependencyErrorMessage);
  }
};

export const execute = async (
  serviceName: string,
  opts: ICommandOptions,
  exitFn: (status: number) => Promise<void>
) => {
  if (!serviceName) {
    logger.error("Service name is missing");
    await exitFn(1);
    return;
  }

  const projectPath = process.cwd();
  logger.verbose(`project path: ${projectPath}`);

  try {
    checkDependencies(projectPath);
    const values = fetchValues(opts);
    await createService(projectPath, serviceName, values);
    await exitFn(0);
  } catch (err) {
    logger.error(
      `Error occurred adding service ${serviceName} to project ${projectPath}`
    );
    logger.error(err);
    await exitFn(1);
  }
};

/**
 * Adds the create command to the service command object
 *
 * @param command Commander command object to decorate
 */
export const createCommandDecorator = (command: commander.Command): void => {
  buildCmd(command, decorator).action(
    async (serviceName: string, opts: ICommandOptions) => {
      await execute(serviceName, opts, async (status: number) => {
        await exitCmd(logger, process.exit, status);
      });
    }
  );
};

/**
 * Create a service in a bedrock project directory.
 *
 * @param rootProjectPath
 * @param serviceName
 * @param packagesDir
 * @param gitPush
 * @param k8sBackendPort
 * @param opts
 */
export const createService = async (
  rootProjectPath: string,
  serviceName: string,
  values: ICommandValues
) => {
  logger.info(
    `Adding Service: ${serviceName}, to Project: ${rootProjectPath} under directory: ${values.packagesDir}`
  );
  logger.info(
    `DisplayName: ${values.displayName}, MaintainerName: ${values.maintainerName}, MaintainerEmail: ${values.maintainerEmail}`
  );

  const newServiceDir = path.join(
    rootProjectPath,
    values.packagesDir,
    serviceName
  );
  logger.info(`servicePath: ${newServiceDir}`);

  shelljs.mkdir("-p", newServiceDir);

  // Create azure pipelines yaml in directory
  await generateStarterAzurePipelinesYaml(rootProjectPath, newServiceDir, {
    variableGroups: values.variableGroups
  });

  // Create empty .gitignore file in directory
  generateGitIgnoreFile(newServiceDir, "");

  // Create simple Dockerfile in directory
  generateDockerfile(newServiceDir);

  // add maintainers to file in parent repo file
  const newUser = {
    email: values.maintainerEmail,
    name: values.maintainerName
  } as IUser;

  const newServiceRelativeDir = path.relative(rootProjectPath, newServiceDir);
  logger.debug(`newServiceRelPath: ${newServiceRelativeDir}`);

  addNewServiceToMaintainersFile(
    path.join(rootProjectPath, "maintainers.yaml"),
    newServiceRelativeDir,
    [newUser]
  );

  // Add relevant bedrock info to parent bedrock.yaml

  const helmConfig: IHelmConfig =
    values.helmChartChart && values.helmChartRepository
      ? {
          chart: {
            chart: values.helmChartChart,
            repository: values.helmChartRepository
          }
        }
      : {
          chart: {
            branch: values.helmConfigBranch,
            git: values.helmConfigGit,
            path: values.helmConfigPath
          }
        };

  addNewServiceToBedrockFile(
    rootProjectPath,
    newServiceRelativeDir,
    values.displayName,
    helmConfig,
    values.middlewaresArray,
    values.k8sPort,
    values.k8sBackend,
    values.pathPrefix,
    values.pathPrefixMajorVersion
  );

  // If requested, create new git branch, commit, and push
  if (values.gitPush) {
    await checkoutCommitPushCreatePRLink(
      serviceName,
      newServiceDir,
      path.join(rootProjectPath, BedrockFileName),
      path.join(rootProjectPath, "maintainers.yaml")
    );
  }
};
