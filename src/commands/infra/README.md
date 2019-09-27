## `spk infra`

Command used to generate, deploy, and update Bedrock infrastructure.

#### `spk infra init`

Initializes the environment to deploy Bedrock infrastructure. The `spk infra init` will do the following:

- Install prerequisites (e.g. terraform, git, helm, az cli) if not already installed.
- Verifies that user is logged into Azure via CLI
- Check for environment variables (e.g. ARM_SUBSCRIPTION_ID, ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_TENANT_ID)
