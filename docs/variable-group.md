# Variable Group

Create variable group in Azure DevOps project.

Usage:

```
spk service [command] [options]
```

Commands:

- [Variable Group](#variable-group)
  - [Prerequisites](#prerequisites)
  - [Commands](#commands)
    - [create](#create)

Global options:

```
  -v, --verbose        Enable verbose logging
  -h, --help           Usage information
```

## Prerequisites

1. An Azure DevOps project.

2. To link secrets from an Azure key vault as variables in Variable Group, you
   will need an existing key vault containing your secrets and the Service
   Principal for authorization with Azure Key Vault.
   - Use existng or
     [create a service prrincipal either in Azure Portal](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
     or
     [with Azure CLI](https://docs.microsoft.com/en-us/cli/azure/create-an-azure-service-principal-azure-cli?view=azure-cli-latest).
   - Use existing or
     [create a Key Vault in Azure Portal](https://docs.microsoft.com/en-us/azure/key-vault/quick-create-portal)
     or
     [with Azure CLI](https://docs.microsoft.com/en-us/azure/key-vault/quick-create-cli).
   - Give the service principal `get` and `list` access in Azure Key Vault.
     Follow step 2 from
     [these instructions](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?view=azure-devops&tabs=yaml#link-secrets-from-an-azure-key-vault).

## Commands

### create

Add a new variable group in Azure DevOps project

```
Usage:
spk variable-group create|c [options]

Options:
  -f, --file <file>                     Path to the yaml file that contains variable group manifest
  -o, --org-name <organization-name>    Azure DevOps organization name; falls back to azure_devops.org in spk config
  -p, --project <project>               Azure DevOps project name; falls back to azure_devops.project in spk config
  -t, --personal-access-token <pat>     Personal access token associated with the Azure DevOps otg; falls back to azure_devops.access_token in spk config
```

#### Variable Group Yaml Manifest

1. Variable Group sample manifest with variables stored in Azure DevOps

   ```
   name: "myvg"
   description: "myvg description"
   type: "Vsts"
   variables:
     storage-account-name:
       value: fabrikamstorage
     storage-account-access-key:
       value: "confidential key"
       isSecret: true
   ```

   _*NOTE:*_

   - `variables` value can also be in json format as shown below.
     ```
     variables: { storage-account-name: { value: "fabrikamstorage" }, storage-account-access-key: {value: "confidential key", isSecret: true } }
     ```

2. Variable Group sample manifest with varibles linking to secrets in Azure Key
   Vault

   ```
   name: "myvg"
   description: "myvg description"
   type: "AzureKeyVault"
   variables:
       storage-account-name:
           enabled: true
       storage-account-access-key:
           enabled: true
       personal-access-token:
           enabled: true
   key_vault_provider:
     name: "mykeyvault"                                      # name of the Azure Key Vault with Secrets
     service_endpoint:                                       # service endpoint is required to authorize with Azure Key Vault
       name: "service-connection-name"                       # service endpoint name
       subscription_id: "subscription-id"                    # Azure Subscription id where Key Vault exist
       subscription_name: "sub-name"                         # Azure Subscription name where Key Vault exist
       service_principal_id: "service-principal-id"          # Service Principal Id that has 'Get' and 'List' in Key Vault Access Policy
       service_principal_secret: "service-principal-secret"  # Service Principal secret
       tenant_id: "tenant-id"                                # AAD Tenant Id for the above Service Principal

   ```

   **_NOTE:_**

   - `name` SPK will try to find an existing service endpoint by name and
     creates a new service end point if needed.

   - `variables` value can also be in json format as shown below.
     ```
     variables: { storage-account-name: { enabled: true }, storage-account-access-key: { enabled: true }, personal-access-token: { enabled: true } }
     ```
