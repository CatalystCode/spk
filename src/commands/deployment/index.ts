import { Command } from "../command";
import { getCommandDecorator } from "./get";

/**
 * `deployment` command
 */
export const deploymentCommand = Command(
  "deployment",
  "Introspect your deployments",
  [getCommandDecorator]
);
