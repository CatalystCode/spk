import commander from "commander";
import { logger } from "../logger";
import { hasValue } from "./validator";

/**
 * Command Option
 */
export interface ICommandOption {
  arg: string;
  description: string;
  required: boolean;
}

/**
 * Map of key (stirng) to its command option
 */
export interface ICommandOptionObject {
  [key: string]: ICommandOption;
}

/**
 * Command Descriptor
 */
export interface ICommandBuildElements {
  command: string;
  alias: string;
  description: string;
  options: ICommandOptionObject;
}

/**
 * Builds a command
 *
 * @param command Commander instance
 * @param decorator Decorator object that influence how command is built.
 * @return new command object;
 */
export const build = (
  command: commander.Command,
  decorator: ICommandBuildElements
): commander.Command => {
  const cmd = command
    .command(decorator.command)
    .alias(decorator.alias)
    .description(decorator.description);

  const options = decorator.options;
  Object.getOwnPropertyNames(options).forEach(name => {
    const opt = options[name];
    cmd.option(opt.arg, opt.description);
  });
  return cmd;
};

/**
 * Returns error messages if there are missing values for the
 * mandatory options.
 *
 * @param decorator Descriptor for command building
 * @param values Values to be inspected.
 * @return error messages.
 */
export const validateForRequiredValues = (
  decorator: ICommandBuildElements,
  values: { [key: string]: string | undefined }
): string[] => {
  // gather the required variable names from the decorator options object
  const requireds = Object.getOwnPropertyNames(decorator.options).filter(
    name => decorator.options[name].required
  );

  // figure out which variables have missing values
  const missingValues = requireds.filter(key => !hasValue(values[key]));

  // gather the option flags (args) for the missing one
  const errors = missingValues.map(key => decorator.options[key].arg);

  if (errors.length !== 0) {
    logger.error(`the following arguments are required: ${errors.join("\n ")}`);
  }
  return errors;
};
