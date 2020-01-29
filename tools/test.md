## SPK Commands

- [hld init](#hld-init)
- [infra generate](#infra-generate)
- [project create-variable-group](#project-create-variable-group)
- [project init](#project-init)

---

## Details

### hld init

```
spk hld init|i [options]

Options:
  --git-push
    SPK CLI will try to commit and push these changes to a new origin/branch.


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)

### infra generate

```
spk infra generate|g [options]

Options:
  -p, --project <path to project folder to generate>
    Location of the definition.yaml file that will be generated


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)

### project create-variable-group

```
spk project create-variable-group|cvg <variable-group-name> [options]

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

### project init

```
spk project init|i [options]

Options:
  -r, --default-ring <branch-name>
    Specify a default ring; this corresponds to a default branch which you wish to push initial revisions to


  -h, --help
    output usage information
```

[Go to Top](#SPK-Commands)
