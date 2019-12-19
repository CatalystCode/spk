# Managing a bedrock project with spk

This is a work in progress guide on managing a project with
[bedrock](https://github.com/microsoft/bedrock/) workflows via the
[spk](https://github.com/catalystcode/spk) CLI tool.

## Table of Contents

- [Managing a bedrock project with spk](#managing-a-bedrock-project-with-spk)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Components](#components)
    - [Setup spk](#setup-spk)
      - [Initializing spk](#initializing-spk)
    - [Repositories](#repositories)
      - [Materialized Manifests Repository](#materialized-manifests-repository)
        - [Initializing the Materialized Manifests Repository](#initializing-the-materialized-manifests-repository)
      - [High Level Definition Repository](#high-level-definition-repository)
        - [Initializing the High Level Definition Repository](#initializing-the-high-level-definition-repository)
      - [Application Repositories](#application-repositories)
        - [Initializing an Application Repository](#initializing-an-application-repository)
        - [Adding a Service to a Application Repository](#adding-a-service-to-a-application-repository)
        - [Creating a Service Revision](#creating-a-service-revision)
    - [Varible Groups](#varible-groups)
    - [Pipelines](#pipelines)

## Requirements

This guide assumes a few things:

1. The application code and supporting repositories are hosted on
   [Azure Devops](https://azure.microsoft.com/en-us/services/devops/).
2. The application is packaged and run through a Docker image hosted on
   [Azure Container Registry](https://azure.microsoft.com/en-us/services/container-registry/)
3. The user running `spk` has full access to the above resources.
4. The user is running the latest `spk`
   [release](https://github.com/catalystcode/spk/releases).
5. The user has
   [Azure CLI installed](https://docs.microsoft.com/en-us/cli/azure/?view=azure-cli-latest).

## Components

### Setup spk

Make sure to download the latest version of spk from the
[releases](https://github.com/catalystcode/spk/releases) page and add it to your
PATH.

#### Initializing spk

`spk` commands can usually accept parameters via option flags; however, if a
user would like to set some base parameters for each `spk` command run, then
they should first run `spk init -f <spk-config.yaml>` where `spk-config.yaml`
the path to a configuation file. A sample configuration file with definitions
can be found [here](./../spk-config.yaml).

For managing projects, repositories, and pipelines via `spk`, only the
`azure_devops` needs to be configured.

### Repositories

#### Materialized Manifests Repository

This repository holds all the materialized kubernetes manifests that should be
deployed to a cluster. If a cluster has been deployed via bedrock's terraform
templates, then flux should be configured to point to this repository and will
deploy all manifests in this repository to the cluster in a set interval.

##### Initializing the Materialized Manifests Repository

- [Create a repository in the given AzDO project.](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-new-repo?view=azure-devops#create-a-repo-using-the-web-portal)
- [Clone the repository.](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-new-repo?view=azure-devops#clone-the-repo-to-your-computer)
- Add a simple README to the repository
  ```
  touch README.md
  echo "This is the Flux Manifest Repository." >> README.md
  git add -A
  git commit -m "Initializing Materialized Manifests repository with a README."
  git push -u origin --all
  ```

#### High Level Definition Repository

This repository holds all the bedrock "High Level Defenition" (HLD) yaml files
and associated configurations. These HLDs and configs are consumed via
[fabrikate](https://github.com/microsoft/fabrikate) to produce kubernetes
manifests. This is typically done via an Azure DevOps pipeline, and the
manifests output by fabrikate are placed into the Materialied Manifests
repository.

##### Initializing the High Level Definition Repository

- [Create a repository in the given AzDO project.](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-new-repo?view=azure-devops#create-a-repo-using-the-web-portal)
- [Clone the repository.](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-new-repo?view=azure-devops#clone-the-repo-to-your-computer)
- Initialize via `spk`, this will add the fabrikate
  [cloud-native](https://github.com/microsoft/fabrikate-definitions/tree/master/definitions/fabrikate-cloud-native)
  stack as a initial sample component.
  ```
  spk hld init
  git add -A
  git commit -m "Initializing HLD repository with the cloud-native stack."
  git push -u origin --all
  ```
- Deploy the Manifest Generation pipeline (optional flag parameters can be used
  if `spk` was not intialized)
  ```
  spk hld install-manifest-pipeline
  ```

#### Application Repositories

These repositories hold the application code and its associated Dockerfiles.
Additionally, these repositories can hold one (single application) or more
(monorepository) applications depending on usecase and configuration. Typically,
each repository shold be configured with a "hld-lifecycle" Azure DevOps pipeline
that will add all managed applications inside the repository to the High Level
Definition Repository. Additionally, each application inside the repository
should also have an associated Azure DevOps multi-stage pipeline that both
builds and deploys the latest Docker image to Azure Container Registry and
updates the associated configuation in the HLD repository with the latest image
tag.

##### Initializing an Application Repository

- [Create a repository in the given AzDO project.](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-new-repo?view=azure-devops#create-a-repo-using-the-web-portal)
- [Clone the repository.](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-new-repo?view=azure-devops#clone-the-repo-to-your-computer)
- Initialize the project via `spk`
  ```
  spk project init
  git add -A
  git commit -m "Initializing application repository."
  git push -u origin --all
  ```
- Create Variable Group via `spk` (optional flag parameters can be used if `spk`
  was not intialized)
  ```
  VARIABLE_GROUP_NAME=<my-vg-name>
  spk project create-variable-group $VARIABLE_GROUP_NAME -r $ACR_NAME -u $SP_APP_ID -t $SP_TENANT -p $SP_PASS
  git add -A
  git commit -m "Adding Project Variable Group."
  git push -u origin --all
  ```
  where `ACR_NAME` is the name of the Azure Container Registry where the Docker
  Images will be served from and `SP_APP_ID`, `SP_PASS`, and, `SP_TENANT` are an
  associated Service Principal's ID, Password, and Tenant, that have Read and
  Write access to the ACR.
- Deploy the lifecycle pipeline (optional flag parameters can be used if `spk`
  was not intialized)
  ```
  spk project install-lifecycle-pipeline
  ```

##### Adding a Service to a Application Repository

- [Clone the repository.](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-new-repo?view=azure-devops#clone-the-repo-to-your-computer)
- Create the service via `spk`, there are optional parameters that _should_ be
  used to configure the service and its associated helm charts (other optional
  flag parameters can be used if `spk` was not intialized)
  ```
  SERVICE_NAME=<my-new-service-name>
  spk service create $SERVICE_NAME
  git add -A
  git commit -m "Adding $SERVICE_NAME to the repository."
  git push -u origin --all
  ```
- Deploy the service's multistage build pipeline via `spk` (optional flag
  parameters can be used if `spk` was not intialized)
  ```
  spk service install-build-pipeline $SERVICE_NAME
  ```

##### Creating a Service Revision

TBD

### Varible Groups

TBD

- Done to hold secure credentials and secrets.

### Pipelines

TBD

- Application build & update (1 per application)
- HLD lifecycle (adds applications to HLD repo)
- HLD to Manifests (generates manifests via fabrikate and places manifests into
  flux's source repo)
