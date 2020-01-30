import commander from "commander";
import path from "path";
import shelljs from "shelljs";
import { Bedrock, bedrockFileInfo } from "../../config";
import {
  projectCvgDependencyErrorMessage,
  projectInitCvgDependencyErrorMessage
} from "../../constants";
import {
  addNewService as addNewServiceToBedrockFile,
  YAML_NAME as BedrockFileName
} from "../../lib/bedrockYaml";
import { build as buildCmd, exit as exitCmd } from "../../lib/commandBuilder";
import {
  addNewServiceToMaintainersFile,
  generateDockerfile,
  generateGitIgnoreFile,
  generateStarterAzurePipelinesYaml
} from "../../lib/fileutils";
import { checkoutCommitPushCreatePRLink } from "../../lib/gitutils";
import { isPortNumber } from "../../lib/validator";
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
  maintainerEmail: string;
  maintainerName: string;
  middlewares: string;
  packagesDir: string;
  k8sServicePort: string;
}

export interface ICommandValues extends ICommandOptions {
  k8sPort: number;
  middlewaresArray: string[];
  variableGroups: string[];
}

export const fetchValues = (opts: ICommandOptions) => {
  if (!isPortNumber(opts.k8sServicePort)) {
    throw new Error("value for --k8s-service-port is not a value port number");
  }
  const bedrock = Bedrock();

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
    k8sPort: parseInt(opts.k8sServicePort, 10),
    k8sServicePort: opts.k8sServicePort,
    maintainerEmail: opts.maintainerEmail,
    maintainerName: opts.maintainerName,
    middlewares: opts.middlewares,
    middlewaresArray,
    packagesDir: opts.packagesDir,
    variableGroups: bedrock.variableGroups || []
  };

  // values need not be validated (that's do not need
  // to do is type === "string" check because default values
  // are provided in the commander and most of them
  // are "" except for gitPush is false and k8sServicePort
  // is "80"
  return values;
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
    const fileInfo: IBedrockFileInfo = await bedrockFileInfo(projectPath);
    if (fileInfo.exist === false) {
      logger.error(projectInitCvgDependencyErrorMessage());
      await exitFn(1);
      return;
    }

    if (fileInfo.hasVariableGroups === false) {
      logger.error(projectCvgDependencyErrorMessage());
      await exitFn(1);
      return;
    }

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
    values.k8sPort
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
