import { Command } from "../command";
import { createCommandDecorator } from "./create";
import { dashboardCommandDecorator } from "./dashboard";
import { getCommandDecorator } from "./get";
import { onboardCommandDecorator } from "./onboard";
import { selfTestCommandDecorator } from "./self-test";
import { validateCommandDecorator } from "./validate";

/**
 * `deployment` command
 */
export const deploymentCommand = Command(
  "deployment",
  "Introspect your deployments",
  [
    getCommandDecorator,
    onboardCommandDecorator,
    validateCommandDecorator,
    dashboardCommandDecorator,
    createCommandDecorator,
    selfTestCommandDecorator
  ]
);
