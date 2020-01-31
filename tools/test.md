## SPK Commands

- [spk hld init](#spk-hld-init)
- [spk infra generate](#spk-infra-generate)
- [spk infra scaffold](#spk-infra-scaffold)
- [spk project create-variable-group](#spk-project-create-variable-group)
- [spk project init](#spk-project-init)
- [spk project install-lifecycle-pipeline](#spk-project-install-lifecycle-pipeline)
- [spk service create](#spk-service-create)

---

## Details

### spk hld init

```
spk hld init|i [options]
  Initialize High Level Definition repository. Add manifest-generation.yaml file to working directory/repository if it does not already exist.

Options:
  --git-push
    SPK CLI will try to commit and push these changes to a new origin/branch.


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)

### spk infra generate

```
spk infra generate|g [options]
  Generate scaffold for terraform cluster deployment.

Options:
  -p, --project <path to project folder to generate>
    Location of the definition.yaml file that will be generated


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)

### spk infra scaffold

```
spk infra scaffold|s [options]
  Create initial scaffolding for cluster deployment.

Options:
  -n, --name <name>
    Cluster name for scaffolding


  -s, --source <cluster definition github repo>
    Source URL for the repository containing the terraform deployment


  -v, --version <repository version>
    Version or tag for the repository so a fixed version is referenced


  -t, --template <path to variables.tf>
    Location of the variables.tf for the terraform deployment


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)

### spk project create-variable-group

```
spk project create-variable-group|cvg <variable-group-name> [options]
  Create a new variable group in Azure DevOps project with specific variables (ACR name, HLD Repo name, Personal Access Token, Service Principal id, Service Principal password, and Azure AD tenant id)

Options:
  -r, --registry-name <registry-name>
    The name of the existing Azure Container Registry.


  -d, --hld-repo-url <hld-repo-url>
    The high level definition (HLD) git repo url; falls back to azure_devops.org in spk config.


  -u, --service-principal-id <service-principal-id>
    Azure service principal id with `contributor` role in Azure Container Registry.


  -p, --service-principal-password <service-principal-password>
    The Azure service principal password.


  -t, --tenant <tenant>
    The Azure AD tenant id of service principal.


  --org-name <organization-name>
    Azure DevOps organization name; falls back to azure_devops.org in spk config.


  --project <project>
    Azure DevOps project name; falls back to azure_devops.project in spk config.


  --personal-access-token <personal-access-token>
    Azure DevOps Personal access token; falls back to azure_devops.access_token in spk config.


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)

### spk project init

```
spk project init|i [options]
  Initialize your spk repository. Add starter bedrock.yaml, maintainers.yaml, hld-lifecycle.yaml, and .gitignore files to your project.

Options:
  -r, --default-ring <branch-name>
    Specify a default ring; this corresponds to a default branch which you wish to push initial revisions to


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)

### spk project install-lifecycle-pipeline

```
spk project install-lifecycle-pipeline|p [options]
  Install the hld lifecycle pipeline to your Azure DevOps instance

Options:
  -n, --pipeline-name <pipeline-name>
    Name of the pipeline to be created


  -p, --personal-access-token <personal-access-token>
    Personal Access Token


  -o, --org-name <org-name>
    Organization Name for Azure DevOps


  -r, --repo-name <repo-name>
    Repository Name in Azure DevOps


  -u, --repo-url <repo-url>
    Repository URL


  -d, --devops-project <devops-project>
    Azure DevOps Project


  -b, --build-script-url <build-script-url>
    Build Script URL. By default it is https://raw.githubusercontent.com/Microsoft/bedrock/master/gitops/azure-devops/build.sh.


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)

### spk service create

```
spk service create|c <service-name> [options]
  Add a new service into this initialized spk project repository

Options:
  -c, --helm-chart-chart <helm-chart>
    bedrock helm chart name. --helm-chart-* and --helm-config-* are exclusive; you may only use one.


  -r, --helm-chart-repository <helm-repository>
    bedrock helm chart repository. --helm-chart-* and --helm-config-* are exclusive; you may only use one.


  -b, --helm-config-branch <helm-branch>
    bedrock custom helm chart configuration branch. --helm-chart-* and --helm-config-* are exclusive; you may only use one.


  -p, --helm-config-path <helm-path>
    bedrock custom helm chart configuration path. --helm-chart-* and --helm-config-* are exclusive; you may only use one.


  -g, --helm-config-git <helm-git>
    bedrock helm chart configuration git repository. --helm-chart-* and --helm-config-* are exclusive; you may only use one.


  -d, --packages-dir <dir>
    The directory containing the mono-repo packages.


  -n, --display-name <display-name>
    Display name of the service.


  -m, --maintainer-name <maintainer-name>
    The name of the primary maintainer for this service.


  -e, --maintainer-email <maintainer-email>
    The email of the primary maintainer for this service.


  --git-push
    SPK CLI will try to commit and push these changes to a new origin/branch named after the service.


  --middlewares <comma-delimitated-list-of-middleware-names>
    Traefik2 middlewares you wish to to be injected into your Traefik2 IngressRoutes


  --k8s-backend-port <port>
    Kubernetes service port which this service is exposed with; will be used to configure Traefik2 IngressRoutes


  --k8s-backend <backend>
    Kubernetes backend service name; will be used to configure Traefik2 IngressRoutes


  --path-prefix <path-prefix>
    The path prefix for ingress route; will be used to configure Traefik2 IngressRoutes. If omitted, then the service name will used.


  --path-prefix-major-version <path-prefix-major-version>
    Version to be used in the path prefix; will be used to configure Traefik2 IngressRoutes. ie. 'v1' will result in a path prefix of '/v1/servicename


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)
