# Service Introspection

Service Introspection shows information about Bedrock deployments:

- Name of the person that changed the service
- Time the service was changed or errored
- Deployment state of the service is

Usage: `spk deployment [command] [options]`

Commands:

- [get](#get-command)
- [onboard](#onboard-command)
- [validate](#validate-command)

Global options:

```
  -v, --verbose        Enable verbose logging
  -h, --help           Usage information
```

## Requirements

Fill out the service introspection settings in your spk config file, for example
`spk-config.yaml`. [Sample config file](./../../spk-config.yaml).

```
introspection:
  azure: # This is the storage account for the service introspection tool
    account_name: "storage-account-name"
    table_name: "table-name"
    partition_key: "partition-key"
    key: "storage-access-key"
    service_principal_id: "service-principal-id"
    service_principal_secret: "service-principal-secret"
    subscription_id: "subscription-id"
    tenant_id: "tenant-id"
    resource-group: "resource-group-name"
```

## Commands

### get

Get the list of deployments by service name, release environment, build ID,
commit ID, or container image tag.

```
Usage:
spk deployment get|g [options]

Options:
  -b, --build-id <build-id>            Filter by the build ID of the source repository
  -c, --commit-id <commit-id>          Filter by a commit ID from the source repository
  -d, --deployment-id <deployment-id>  Filter by the deployment ID of the source repository
  -i, --image-tag <image-tag>          Filter by a container image tag
  -e, --env <environment>              Filter by environment name
  -s, --service <service-name>         Filter by service name
  -o, --output <output-format>         Output the information one of the following: normal, wide, JSON
  -w, --watch                          Watch the deployments for a live view
  -h, --help                           Usage information
```

### onboard

Onboard to use the service introspection tool. This will create a storage
account in your subscription.

Prerequisites:

1. Service principal with owner access.
   [Create a service principal with owner access.](#service-principal)
2. Azure key vault.
   [How to create key vault](https://docs.microsoft.com/en-us/azure-stack/user/azure-stack-key-vault-manage-portal?view=azs-1908).
3. Give the service principal get and list access. Follow step 2 from
   [these instructions](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?view=azure-devops&tabs=yaml#link-secrets-from-an-azure-key-vault).

```
Usage:
spk deployment onboard|o [options]`

Options:
  -n, --storage-account-name <storage-account-name>                Account name for the storage table
  -l, --storage-location <storage-location>                        Azure location for Storage account and resource group when they do not exist
  -r, --storage-resource-group-name <storage-resource-group-name>  Name of the resource group for the storage account
  -k, --key-vault-name <key-vault-name>                            Name of the Azure key vault
  -h, --help                                                       Usage information

```

### validate

Validate the [requirements](#requirements)

```
Usage:
spk deployment validate|v [options]

Options:
  -h, --help  Usage information

```

## Service Principal

Create a service principal with owner access:

```
az ad sp create-for-rbac --role Owner --scopes /subscriptions/<your-subscription-id>
```
