# Service Introspection

Service Introspection show information about Bedrock deployments:

- Name of the person that changed the service
- Time the service was changed or errored
- Deployment state of the service is

To use service introspection use the `spk deployment` commands. The following
options and commands are supported:

```
Options:
  -v, --verbose        Enable verbose logging
  -h, --help           output usage information

Commands:
  get|g [options]      Get deployment(s) for a service, release environment, build Id, commit Id, or image tag.
  onboard|o [options]  Onboard to use the service introspection tool. This will create a storage account in your subscription.
  validate|v           Validate deployment(s) for a service, release environment, build Id, commit Id, or image tag.

```

## get command

Get deployment(s) for a service, release environment, build Id, commit Id, or
image tag.

Usage: `spk deployment get|g [options]`

```
Options:
  -b, --build-id <build-id>            Get deployments for a particular build Id from source repository
  -c, --commit-id <commit-id>          Get deployments for a particular commit Id from source repository
  -d, --deployment-id <deployment-id>  Get deployments for a particular deployment Id from source repository
  -i, --image-tag <image-tag>          Get deployments for a particular image tag
  -e, --env <environment>              Get deployments for a particular environment
  -s, --service <service-name>         Get deployments for a particular service
  -o, --output <output-format>         Get output in one of these forms: normal, wide, JSON
  -w, --watch                          Watch the deployments for a live view
  -h, --help                           output usage information

```

## onboard command

Onboard to use the service introspection tool. This will create a storage
account in your subscription.

Usage: ``spk deployment onboard|o [options]`

```
Options:
  -n, --storage-account-name <storage-account-name>                Account name for the storage table
  -l, --storage-location <storage-location>                        Azure location for Storage account and resource group when they do not exist
  -r, --storage-resource-group-name <storage-resource-group-name>  Name of the resource group for the storage account
  -k, --key-vault-name <key-vault-name>                            Name of the Azure key vault
  -h, --help                                                       output usage information

```

## validate command

Validate deployment(s) for a service, release environment, build Id, commit Id,
or image tag.

Usage: `spk deployment validate|v [options]`

```
Options:
  -h, --help  output usage information

```
