# Onboard a Bedrock project to use Service Introspection

If you have already followed the steps
[here](https://github.com/microsoft/bedrock/tree/master/gitops) to setup the
pipelines for a GitOps workflow in Bedrock, you may update your pipelines to
send data to the Spektate storage, which will help you run the introspection
tool on your services.

## Pre-Requisites

Service introspection tool needs an Azure storage account to store information
about your pipelines and services.

If you don't already have an Azure storage account you would like to use, use
the `spk deployment onboard` command which will create a storage account in your
subscription.

You may also create this storage account manually. You will need to have the
following properties of this storage before proceeding:

- Name of the storage account
- Access key to this storage account
- Table name (this is the table that will store Spektate introspection details)

Once you have a storage account with a table, you may proceed to start updating
the pipelines to send data to Spektate storage.

## Update the pipelines to send data to storage

1. Create a variable group with the following variables, which will be used by
   the tasks in each of the pipelines to access the storage.

   - `ACCOUNT_KEY`: Set this to the access key for your storage account
   - `ACCOUNT_NAME`: Set this to the name of your storage account
   - `PARTITION_KEY`: This field can be a distinguishing key that recognizea
     your source repository in the storage, for eg. in this example, we're using
     the name of the source repository `hello-bedrock`
   - `TABLE_NAME`: Set this to the name of the table in your storage account
     that you prefer to use

   ![](./images/variable_group.png)

   Make sure that you update the pipelines in the following steps to include
   this variable group, such as below:

   ```yaml
   variables:
     - group: <your-variable-group-name>
   ```

2. To your CI pipeline that runs from the source repository to build the docker
   image, copy and paste the following task which will update the database for
   every build that runs from the source repository to show up in Spektate.

   ```yaml
   - bash: |
       tag_name="hello-spektate-$(Build.SourceBranchName)-$(Build.BuildId)"
       commitId=$(Build.SourceVersion)
       commitId=$(echo "${commitId:0:7}")
       VERSION_TO_DOWNLOAD=$(curl -s "https://api.github.com/repos/CatalystCode/spk/releases/latest" | grep "tag_name" | sed -E 's/.*"([^"]+)".*/\1/')
       echo "Downloading SPK version $VERSION_TO_DOWNLOAD" && wget "https://github.com/CatalystCode/spk/releases/download/$VERSION_TO_DOWNLOAD/spk-linux"
       chmod +x ./spk-linux
       ./spk-linux deployment update -n $(ACCOUNT_NAME) -k $(ACCOUNT_KEY) -t $(TABLE_NAME) -p $(PARTITION_KEY) --filter-name p1 --filter-value $(Build.BuildId) --image-tag $tag_name --commit-id $commitId --service $(Build.Repository.Name)
     displayName: Update manifest pipeline details in CJ db
   ```

   Make sure the variable `tag_name` is set to the tag name for the image being
   built in your docker step.

   **Note**: The earlier in the pipeline you add this task, the earlier it will
   send data to Spektate. Adding it before the crucial steps is recommended
   since it will capture details about failures if the important steps fail.

3. To your CD release pipeline (ACR to HLD), add the following lines of code to
   the end of your last release task (make sure this is not a separate task in
   the process):

   ```yaml
   latest_commit=$(git rev-parse --short HEAD) echo
   "latest_commit=$latest_commit"

   VERSION_TO_DOWNLOAD=$(curl -s
   "https://api.github.com/repos/CatalystCode/spk/releases/latest" | grep
   "tag_name" | sed -E 's/.*"([^"]+)".*/\1/') echo "Downloading SPK version
   $VERSION_TO_DOWNLOAD" && wget
   "https://github.com/CatalystCode/spk/releases/download/$VERSION_TO_DOWNLOAD/spk-linux"
   chmod +x ./spk-linux ./spk-linux -n $(ACCOUNT_NAME) -k $(ACCOUNT_KEY) -t
   $(TABLE_NAME) -p $(PARTITION_KEY) --filter-name imageTag --filter-value
   $(Build.BuildId) --p2 $(Release.ReleaseId) --hld-commit-id $latest_commit
   --env $(Release.EnvironmentName)
   ```

4. To the Manifest generation pipeline, we need to capture the commit Id, so
   it's best to add this task after the manifest generation step takes place so
   that the update can capture the commit Id into the manifest repository. Add
   the following task:

```yaml
- bash: |
    cd "$HOME"/<name of your manifest repository>
    latest_commit=$(git rev-parse --short HEAD)
    VERSION_TO_DOWNLOAD=$(curl -s "https://api.github.com/repos/CatalystCode/spk/releases/latest" | grep "tag_name" | sed -E 's/.*"([^"]+)".*/\1/')
    echo "Downloading SPK version $VERSION_TO_DOWNLOAD" && wget "https://github.com/CatalystCode/spk/releases/download/$VERSION_TO_DOWNLOAD/spk-linux"
    chmod +x ./spk-linux
    ./spk-linux -n $(ACCOUNT_NAME) -k $(ACCOUNT_KEY) -t $(TABLE_NAME) -p $(PARTITION_KEY) --filter-name hldCommitId --filter-value $commitId --p3 $(Build.BuildId) --manifest-commit-id $latest_commit
  displayName: Update manifest pipeline details in CJ db
```

5. Kick off a full deployment from the source to docker pipeline, and you should
   see some entries coming into the database for each subsequent deployment
   after the tasks have been added!
