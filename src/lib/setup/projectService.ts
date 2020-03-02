import { ICoreApi } from "azure-devops-node-api/CoreApi";
import { ProjectVisibility } from "azure-devops-node-api/interfaces/CoreInterfaces";
import { logger } from "../../logger";
import { IRequestContext } from "./constants";

/**
 * Returns Azure DevOps Project if it exists.
 *
 * @param coreAPI Core API service
 * @param name Name of Project
 */
export const getProject = async (coreAPI: ICoreApi, name: string) => {
  try {
    return await coreAPI.getProject(name);
  } catch (err) {
    if (err.statusCode === 401) {
      throw new Error(
        "Access Token did not have the permission to read project. Grant read project permission to the token"
      );
    }
    throw err;
  }
};

/**
 * Creates an Azure DevOps Project.
 *
 * @param coreAPI Core API service
 * @param name Name of Project
 */
export const createProject = async (coreAPI: ICoreApi, name: string) => {
  try {
    await coreAPI.queueCreateProject({
      capabilities: {
        processTemplate: {
          templateTypeId: "6b724908-ef14-45cf-84f8-768b5384da45" // TOFIX: do not know what this GUID is about (https://docs.microsoft.com/en-us/rest/api/azure/devops/processes/processes/list?view=azure-devops-rest-5.1)
        },
        versioncontrol: {
          sourceControlType: "Git"
        }
      },
      description: "Created by automated tool",
      name,
      visibility: ProjectVisibility.Organization
    });
  } catch (err) {
    if (err.statusCode === 401) {
      throw new Error(
        "Access Token did not have the permission to create project. Grant write to project permission to the token"
      );
    }
    throw err;
  }
};

/**
 * Creates project if it does not exist.
 *
 * @param coreAPI Core API client
 * @param rc request context
 */
export const createProjectIfNotExist = async (
  coreAPI: ICoreApi,
  rc: IRequestContext
) => {
  const projectName = rc.projectName;
  const project = await getProject(coreAPI, projectName);
  if (!project) {
    await createProject(coreAPI, projectName);
    rc.createdProject = true;
    logger.info(`Project, ${projectName} is created.`);
  } else {
    logger.info(`Project, ${projectName} already exists.`);
  }
};
