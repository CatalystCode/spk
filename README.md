# SPK

[![Build Status](https://dev.azure.com/epicstuff/bedrock/_apis/build/status/CatalystCode.spk?branchName=master)](https://dev.azure.com/epicstuff/bedrock/_build/latest?definitionId=128&branchName=master)

`spk` is a tool that provides automation around defining and operating
Kubernetes clusters with [Bedrock](https://github.com/microsoft/bedrock)
principles.

The three core areas of `spk` are:

- [Service Introspection](./docs/service-introspection.md)
- Service Management
- [Cloud Infra Management](./docs/cloud-infra-management.md)

![spk diagram](./docs/images/spk.png)

For more information on the end-to-end experience of using Bedrock principles
refer to:
[Bedrock Developer and Operations Experience](https://github.com/CatalystCode/bedrock-end-to-end-dx)

## CLI

```
Usage:
spk [options] [command]

Commands:
  init|i [options]  Initialize the spk tool for the first time
  deployment        Introspect your deployments
  project           Initialize and manage your Bedrock project.
  service           Create and manage services for a Bedrock project.
  infra             Deploy and modify your Bedrock infrastructure.

```

## `spk` commands docs

Refer to the links below for additional information on each command:

- [deployment](./docs/service-introspection.md)
- service
- [infra](./docs/cloud-infra-management.md)

## Initialize

To start using spk, specify its configuration in a `yaml` file. Refer to the
[spk-config.yaml](./spk-config.yaml) file and follow the same format.

### Environment Variables

To specify private keys or access tokens that should **not be stored in raw
text**, set the values in environment variables.

You may refer to environment variables in your shell if you specify them in the
format `env:{VARIABLE_NAME}`. `spk` will use them from your current shell. Below
is an example of a setting that uses a value from an environment variable,
`ACCESS_KEY`.

```yaml
---
account_name: "someHardcodedValue"
table_name: "anotherNonPrivateKey"
key: "${env:ACCESS_KEY}"
partition_key: "canBeStoredInRawTextKey"
```

**Note:** If you open a new shell window, these variables will have to be set
again, otherwise, `spk` will throw an error on trying to use them. To avoid
setting them each time, specify them in the `.env` file. See below for more
information.

#### .env File

A recommended approach is to have a `.env` file in your folder (make sure it's
gitignored!) with all variables and their values. By default, the `spk` tool
should be able to load these into your local env and use them to replace the
placeholders in the config file you pass in.

Run the `spk init -f <filename>` command, and then you should be all set to
start using the `spk` tool!
