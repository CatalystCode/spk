import commander from "commander";
import fs, { chmod } from "fs";
import fsextra, { readdir } from "fs-extra";
import path from "path";
import { logger } from "../../logger";
import child_process from "child_process";
import gitUrlParse from "git-url-parse";
import { getMaxListeners } from "cluster";
import * as os from "os";

const spkTemplatesPath = os.homedir() + "/.spk/templates";
const simpleGit = require("simple-git");
/**
 * Adds the init command to the commander command object
 *
 * @param command Commander command object to decorate
 */
export const generateCommandDecorator = (command: commander.Command): void => {
  command
    .command("generate")
    .alias("g")
    .description("Generate scaffold for terraform cluster deployment.")
    .option(
      "-p, --project <path to project folder to generate> ",
      "Location of the definition.json file that will be generated"
    )
    .action(async opts => {
      try {
        if (opts.project) {
          logger.info(
            `spk will generate the following project: ${opts.project}`
          );
        } else {
          opts.project = process.cwd();
          logger.warn(
            `No project folder was provided, spk will generate the current folder as a project`
          );
        }
        if (!fs.existsSync(spkTemplatesPath)) {
          fs.mkdirSync(spkTemplatesPath);
        }
        await validateDefinition(opts.project);
        const jsonSource = await validateTemplateSource(opts.project);
        await validateRemoteSource(jsonSource);
      } catch (err) {
        logger.error(
          "Error occurred while generating project deployment files"
        );
        logger.error(err);
      }
    });
};

/**
 * Checks if definition.json is present locally to provided project path
 *
 * @param projectPath Path to the definition.json file
 */
export const validateDefinition = async (
  projectPath: string
): Promise<boolean> => {
  try {
    if (!fs.existsSync(path.join(projectPath, "definition.json"))) {
      logger.error(
        `Provided project path for generate is invalid or definition.json can not be found: ${projectPath}`
      );
      return false;
    }
    logger.info(
      `Project folder found. Attempting to generate definition.json file.`
    );
  } catch (_) {
    logger.error(`Unable to validate project folder path.`);
    return false;
  }
  return true;
};

/**
 * Checks if working definition.json is present in the provided project path with validated source & version
 *
 * @param projectPath Path to the definition.json file
 */
export const validateTemplateSource = async (
  projectPath: string
): Promise<Array<string>> => {
  emptyJSON: JSON;
  try {
    const rootDef = path.join(projectPath, "definition.json");
    const data: string = fs.readFileSync(rootDef, "utf8");
    const definitionJSON = JSON.parse(data);
    // TO DO : Check for malformed JSON
    if (
      !(definitionJSON.source, definitionJSON.version, definitionJSON.template)
    ) {
      logger.info(
        `The definition.json file is invalid. There is a missing field for the definition file's sources. Template: ${definitionJSON.template} source: ${definitionJSON.source} version: ${definitionJSON.version}`
      );
      return [];
    }
    logger.info(
      `Checking for locally stored template: ${definitionJSON.template} from remote repoitory: ${definitionJSON.source} at version: ${definitionJSON.version}`
    );
    const sources = [
      definitionJSON.source,
      definitionJSON.template,
      definitionJSON.version
    ];
    return sources;
  } catch (_) {
    logger.error(
      `Unable to validate project folder definition.json fie. Is it malformed?`
    );
    return [];
  }
  return [];
};

/**
 * Checks if provided source, template and version are valid. TODO/ Private Repo, PAT, ssh-key agent
 *
 * @param projectPath Path to the definition.json file
 */
export const validateRemoteSource = async (
  definitionJSON: Array<string>
): Promise<boolean> => {
  try {
    const [source, template, version] = definitionJSON;
    // Converting source name to storable folder name
    const httpReg = /^(.*?)\.com/;
    const punctuationReg = /[^\w\s]/g;
    let sourceFolder = source.replace(httpReg, "");
    sourceFolder = sourceFolder.replace(punctuationReg, "_").toLowerCase();
    const sourcePath = path.join(spkTemplatesPath, sourceFolder);
    logger.warn(`Converted to: ${sourceFolder}`);
    logger.info(`Checking if source:${sourcePath} is stored locally.`);
    if (!fs.existsSync(sourcePath)) {
      logger.warn(
        `Provided source template folder was not found, attempting to clone the template source repo locally.`
      );
      fs.mkdirSync(sourcePath);
    } else {
      logger.info(
        `Source template folder found. Checking remote existence of remote repository`
      );
    }
    // Checking for git remote
    simpleGit(sourcePath).listRemote([source], (err: any, result: any) => {
      if (err) {
        logger.error(
          `There was an error cloning the source repository: ${err}`
        );
        return false;
      } else {
        if (!result) {
          logger.error(
            `Unable to clone the source remote repository. Does the repo exist? ${result}`
          );
          return false;
        } else {
          logger.info(
            `Cloning remote source: ${source} to local templates ${sourcePath}.`
          );
          simpleGit(sourcePath).clone(source);
        }
      }
    });
  } catch (_) {
    logger.error(
      `Unable to validate project folder definition.json fie. Is it malformed?`
    );
    return false;
  }
  return true;
};
