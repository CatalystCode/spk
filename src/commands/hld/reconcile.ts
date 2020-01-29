import child_process from "child_process";
import commander from "commander";
import { writeFileSync } from "fs";
import yaml from "js-yaml";
import path from "path";
import process from "process";
import shelljs, { TestOptions } from "shelljs";
import { Bedrock } from "../../config";
import { TraefikIngressRoute } from "../../lib/traefik/ingress-route";
import {
  ITraefikMiddleware,
  TraefikMiddleware
} from "../../lib/traefik/middleware";
import { logger } from "../../logger";
import { IBedrockFile, IBedrockServiceConfig } from "../../types";

interface IResult<T> {
  error?: Error;
  value: T;
}

/**
 * IExecResult represents the possible return value of a Promise based wrapper
 * for child_process.exec(). `error` would specify an optional ExecException
 * which can be passed via a resolve() value instead of throwing an untyped
 * reject()
 */
type IExecResult = IResult<{ stdout: string; stderr: string }> & {
  error?: child_process.ExecException;
};

/**
 * Type definition for a Promise based child_process.exec() wrapper.
 */
type ExecCommand = (
  commandToRun: string,
  pipeIO?: boolean
) => Promise<IExecResult>;

/**
 * Promise wrapper for child_process.exec(). This returned Promise will never
 * reject -- instead if an Error occurs, it will be returned via the resolved
 * value.
 *
 * @param cmd The command to shell out and exec
 * @param pipeIO if true, will pipe all stdio the executing parent process
 */
const exec: ExecCommand = (cmd, pipeIO) => {
  return new Promise(resolve => {
    const child = child_process.exec(cmd, (error, stdout, stderr) => {
      return resolve({
        error: error ?? undefined,
        value: { stdout, stderr }
      });
    });
    if (pipeIO) {
      child.stdin?.pipe(process.stdin);
      child.stdout?.pipe(process.stdout);
      child.stderr?.pipe(process.stderr);
    }
    return child;
  });
};

export interface IReconcileDependencies {
  exec: ExecCommand;

  writeFile: (path: string, contents: string) => void;

  test: (option: shelljs.TestOptions, path: string) => boolean;

  createRepositoryComponent: (
    execCmd: ExecCommand,
    absHldPath: string,
    repositoryName: string
  ) => Promise<IExecResult>;

  createServiceComponent: (
    execCmd: ExecCommand,
    absRepositoryInHldPath: string,
    pathBase: string
  ) => Promise<IExecResult>;

  createRingComponent: (
    execCmd: ExecCommand,
    svcPathInHld: string,
    ring: string
  ) => Promise<IExecResult>;

  addChartToRing: (
    execCmd: ExecCommand,
    ringPathInHld: string,
    serviceConfig: IBedrockServiceConfig
  ) => Promise<IExecResult>;

  createStaticComponent: (
    execCmd: ExecCommand,
    ringPathInHld: string
  ) => Promise<IExecResult>;

  createIngressRouteForRing: (
    ringPathInHld: string,
    serviceName: string,
    serviceConfig: IBedrockServiceConfig,
    middlewares: ITraefikMiddleware,
    ring: string
  ) => Promise<IResult<undefined>>;

  createMiddlewareForRing: (
    ringPathInHld: string,
    serviceName: string,
    ring: string
  ) => Promise<IResult<ITraefikMiddleware>>;
}

export const reconcileHldDecorator = (command: commander.Command): void => {
  command
    .command(
      "reconcile <repository-name> <hld-path> <bedrock-application-repo-path>"
    )
    .alias("r")
    .description("Reconcile a HLD with the services tracked in bedrock.yaml.")
    .action(async (repositoryName, hldPath, bedrockApplicationRepoPath) => {
      try {
        validateInputs(repositoryName, hldPath, bedrockApplicationRepoPath);
        checkForFabrikate(shelljs.which);

        const absHldPath = testAndGetAbsPath(
          shelljs.test,
          logger.info,
          hldPath,
          "HLD"
        );

        const absBedrockPath = testAndGetAbsPath(
          shelljs.test,
          logger.info,
          bedrockApplicationRepoPath,
          "Bedrock Application"
        );

        const bedrockConfig = Bedrock(absBedrockPath);

        logger.info(
          `Attempting to reconcile HLD with services tracked in bedrock.yaml`
        );

        const reconcileDependencies: IReconcileDependencies = {
          addChartToRing,
          createIngressRouteForRing,
          createMiddlewareForRing,
          createRepositoryComponent,
          createRingComponent,
          createServiceComponent,
          createStaticComponent,
          exec: execAndLog,
          test: shelljs.test,
          writeFile: writeFileSync
        };

        const { error } = await reconcileHld(
          reconcileDependencies,
          bedrockConfig,
          repositoryName,
          absHldPath
        );
        if (error) {
          throw error;
        }
      } catch (err) {
        logger.error(`An error occurred while reconciling HLD`);
        logger.error(err);
        process.exit(1);
      }
    });
};

export const reconcileHld = async (
  dependencies: IReconcileDependencies,
  bedrockYaml: IBedrockFile,
  repositoryName: string,
  absHldPath: string
): Promise<{ error?: Error }> => {
  const managedServices = bedrockYaml.services;
  const managedRings = bedrockYaml.rings;

  // Create Repository Component if it doesn't exist.
  // In a pipeline, the repository component is the name of the application repository.
  const { error: repoErr } = await dependencies.createRepositoryComponent(
    dependencies.exec,
    absHldPath,
    repositoryName
  );
  if (repoErr) {
    return { error: repoErr };
  }

  // Repository in HLD ie /path/to/hld/repositoryName/
  const absRepositoryInHldPath = path.join(absHldPath, repositoryName);

  for (const [serviceRelPath, serviceConfig] of Object.entries(
    managedServices
  )) {
    const pathBase = path.basename(serviceRelPath);
    const serviceName = pathBase;
    logger.info(`Reconciling service: ${pathBase}`);

    // Utilizes fab add, which is idempotent.
    const { error: serviceErr } = await dependencies.createServiceComponent(
      dependencies.exec,
      absRepositoryInHldPath,
      pathBase
    );
    if (serviceErr) {
      return { error: serviceErr };
    }

    // Create ring components.
    const svcPathInHld = path.join(absRepositoryInHldPath, pathBase);

    // If the ring component already exists, we do not attempt to create it.
    const ringsToCreate = Object.keys(managedRings)
      .map(ring => {
        return {
          ring,
          ringPathInHld: path.join(svcPathInHld, ring)
        };
      })
      .filter(({ ring, ringPathInHld }) => {
        const alreadyExists =
          dependencies.test("-e", ringPathInHld) && // path exists
          dependencies.test("-d", ringPathInHld); // path is a directory
        if (alreadyExists) {
          logger.info(
            `Ring component: ${ring} already exists, skipping ring generation.`
          );
        }
        return !alreadyExists;
      });

    // Will only loop over _existing_ rings in bedrock.yaml - does not cover the deletion case, ie: i remove a ring from bedrock.yaml
    for (const { ring, ringPathInHld } of ringsToCreate) {
      // Otherwise, create the ring in the service.
      const { error: ringErr } = await dependencies.createRingComponent(
        dependencies.exec,
        svcPathInHld,
        ring
      );
      if (ringErr) {
        return { error: ringErr };
      }

      // Add the helm chart to the ring.
      const { error: chartErr } = await dependencies.addChartToRing(
        dependencies.exec,
        ringPathInHld,
        serviceConfig
      );
      if (chartErr) {
        return { error: chartErr };
      }

      // Create config directory, create static manifest directory.
      const { error: staticErr } = await dependencies.createStaticComponent(
        dependencies.exec,
        ringPathInHld
      );
      if (staticErr) {
        return { error: staticErr };
      }

      // Service explicitly requests no ingress-routes to be generated.
      if (serviceConfig.disableRouteScaffold) {
        logger.info(
          `Skipping ingress route generation for service ${serviceName}`
        );
        continue;
      }

      // Create middleware.
      const {
        error: middlewareErr,
        value: middlewares
      } = await dependencies.createMiddlewareForRing(
        ringPathInHld,
        serviceName,
        ring
      );
      if (middlewareErr) {
        return { error: middlewareErr };
      }

      // Create Ingress Route.
      dependencies.createIngressRouteForRing(
        ringPathInHld,
        serviceName,
        serviceConfig,
        middlewares,
        ring
      );
    }
  }

  return {};
};

/**
 * Runs a command via `exec` and captures the results, logging the command
 * that will be run, and the results of that command.
 *
 * @param commandToRun String version of the command that must be run
 */
export const execAndLog = async (
  commandToRun: string
): Promise<IExecResult> => {
  logger.info(`Running: ${commandToRun}`);
  const cmdResult = await exec(commandToRun);
  if (cmdResult.error) {
    logger.error(`error executing command \`${commandToRun}\``);
  }
  return cmdResult;
};

const createIngressRouteForRing = async (
  ringPathInHld: string,
  serviceName: string,
  serviceConfig: IBedrockServiceConfig,
  middlewares: ITraefikMiddleware,
  ring: string
): Promise<IResult<undefined>> => {
  const staticComponentPathInRing = path.join(ringPathInHld, "static");
  const ingressRoutePathInStaticComponent = path.join(
    staticComponentPathInRing,
    "ingress-route.yaml"
  );
  const ingressRoute = TraefikIngressRoute(
    serviceName,
    ring,
    serviceConfig.k8sServicePort,
    {
      middlewares: [
        middlewares.metadata.name,
        ...(serviceConfig.middlewares ?? [])
      ]
    }
  );

  const routeYaml = yaml.safeDump(ingressRoute, {
    lineWidth: Number.MAX_SAFE_INTEGER
  });

  logger.info(
    `Writing IngressRoute YAML to ${ingressRoutePathInStaticComponent}`
  );

  writeFileSync(ingressRoutePathInStaticComponent, routeYaml);
  return { value: undefined };
};

const createMiddlewareForRing = async (
  ringPathInHld: string,
  serviceName: string,
  ring: string
): Promise<IResult<ITraefikMiddleware>> => {
  // Create Middlewares
  const staticComponentPathInRing = path.join(ringPathInHld, "static");
  const middlewaresPathInStaticComponent = path.join(
    staticComponentPathInRing,
    "middlewares.yaml"
  );

  const servicePrefix = `/${serviceName}`;
  const middlewares = TraefikMiddleware(serviceName, ring, [servicePrefix]);
  const middlewareYaml = yaml.safeDump(middlewares, {
    lineWidth: Number.MAX_SAFE_INTEGER
  });

  logger.info(
    `Writing Middlewares YAML to ${middlewaresPathInStaticComponent}`
  );
  try {
    writeFileSync(middlewaresPathInStaticComponent, middlewareYaml);
  } catch (error) {
    return { error, value: middlewares };
  }

  return { value: middlewares };
};

export const createRepositoryComponent = async (
  execCmd: (commandToRun: string) => Promise<IExecResult>,
  absHldPath: string,
  repositoryName: string
): Promise<IExecResult> => {
  return execCmd(
    `cd ${absHldPath} && mkdir -p ${repositoryName} && fab add ${repositoryName} --path ./${repositoryName} --method local`
  );
};

export const createServiceComponent = async (
  execCmd: (commandToRun: string) => Promise<IExecResult>,
  absRepositoryInHldPath: string,
  pathBase: string
): Promise<IExecResult> => {
  // Fab add is idempotent.
  // mkdir -p does not fail if ${pathBase} does not exist.
  return execCmd(
    `cd ${absRepositoryInHldPath} && mkdir -p ${pathBase} config && fab add ${pathBase} --path ./${pathBase} --method local --type component && touch ./config/common.yaml`
  );
};

export const createRingComponent = async (
  execCmd: (commandToRun: string) => Promise<IExecResult>,
  svcPathInHld: string,
  ring: string
): Promise<IExecResult> => {
  const createRingInSvcCommand = `cd ${svcPathInHld} && mkdir -p ${ring} config && fab add ${ring} --path ./${ring} --method local --type component && touch ./config/common.yaml`;
  return execCmd(createRingInSvcCommand);
};

export const addChartToRing = async (
  execCmd: (commandToRun: string) => Promise<IExecResult>,
  ringPathInHld: string,
  serviceConfig: IBedrockServiceConfig
): Promise<IExecResult> => {
  let addHelmChartCommand = "";
  const { chart } = serviceConfig.helm;
  if ("git" in chart) {
    const chartVersioning =
      "branch" in chart ? `--branch ${chart.branch}` : `--version ${chart.sha}`;
    addHelmChartCommand = `fab add chart --source ${chart.git} --path ${chart.path} ${chartVersioning}`;
  } else if ("repository" in chart) {
    addHelmChartCommand = `fab add chart --source ${chart.repository} --path ${chart.chart}`;
  }

  return execCmd(`cd ${ringPathInHld} && ${addHelmChartCommand}`);
};

export const createStaticComponent = async (
  execCmd: (commandToRun: string) => Promise<IExecResult>,
  ringPathInHld: string
): Promise<IExecResult> => {
  const createConfigAndStaticComponentCommand = `cd ${ringPathInHld} && mkdir -p config static && fab add static --path ./static --method local --type static && touch ./config/common.yaml`;
  return execCmd(createConfigAndStaticComponentCommand);
};

export const validateInputs = (
  repositoryName: any,
  hldPath: any,
  bedrockApplicationRepoPath: any
) => {
  if (typeof repositoryName !== "string") {
    throw Error(
      `repository-name must be of type 'string', ${typeof repositoryName} given`
    );
  }

  if (typeof hldPath !== "string") {
    throw Error(`hld-path must be of type 'string', ${typeof hldPath} given`);
  }

  if (typeof bedrockApplicationRepoPath !== "string") {
    throw Error(
      `bedrock-application-repo-path must be of type 'string', ${typeof bedrockApplicationRepoPath} given`
    );
  }
};

export const testAndGetAbsPath = (
  test: (flags: TestOptions, path: string) => boolean,
  log: (logline: string) => void,
  possiblyRelativePath: string,
  pathType: string
): string => {
  const absPath = path.resolve(possiblyRelativePath);
  if (!test("-e", absPath) && !test("-d", absPath)) {
    throw Error(`Could not validate ${pathType} path.`);
  }
  log(`Found ${pathType} at ${absPath}`);
  return absPath;
};

export const checkForFabrikate = (which: (path: string) => string) => {
  const fabrikateInstalled = which("fab");
  if (fabrikateInstalled === "") {
    throw Error(
      `Fabrikate not installed. Please fetch and install the latest version: https://github.com/microsoft/fabrikate/releases`
    );
  }
};
