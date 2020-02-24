#!/bin/bash

#Fail on first error
set -e

#Import functions
. ./functions.sh

TEST_WORKSPACE="$(pwd)/spk-env"
[ ! -z "$SPK_LOCATION" ] || { echo "Provide SPK_LOCATION"; exit 1;}
[ ! -z "$ACCESS_TOKEN_SECRET" ] || { echo "Provide ACCESS_TOKEN_SECRET"; exit 1;}
[ ! -z "$AZDO_PROJECT" ] || { echo "Provide AZDO_PROJECT"; exit 1;}
[ ! -z "$AZDO_ORG" ] || { echo "Provide AZDO_ORG"; exit 1;}
[ ! -z "$ACR_NAME" ] || { echo "Provide ACR_NAME"; exit 1;}
[ ! -z "$SP_APP_ID" ] || { echo "Provide SP_APP_ID"; exit 1;}
[ ! -z "$SP_PASS" ] || { echo "Provide SP_PASS"; exit 1;}
[ ! -z "$SP_TENANT" ] || { echo "Provide SP_TENANT"; exit 1;}
[ ! -z "$AZ_RESOURCE_GROUP" ] || { echo "Provide AZ_RESOURCE_GROUP"; exit 1;}
[ ! -z "$AZ_STORAGE_ACCOUNT" ] || { echo "Provide AZ_STORAGE_ACCOUNT"; exit 1;}
AZDO_ORG_URL="${AZDO_ORG_URL:-"https://dev.azure.com/$AZDO_ORG"}"

echo "TEST_WORKSPACE: $TEST_WORKSPACE"
echo "SPK_LOCATION: $SPK_LOCATION"
echo "AZDO_PROJECT: $AZDO_PROJECT"
echo "AZDO_ORG: $AZDO_ORG"
echo "AZDO_ORG_URL: $AZDO_ORG_URL"
echo "ACR_NAME: $ACR_NAME"
echo "AZ_RESOURCE_GROUP: $AZ_RESOURCE_GROUP"
echo "AZ_STORAGE_ACCOUNT: $AZ_STORAGE_ACCOUNT"

branchName=myFeatureBranch
FrontEnd=fabrikam.acme.frontend
BackEnd=fabrikam.acme.backend
export hld_dir=fabrikam-hld
export manifests_dir=fabrikam-manifests
vg_name=fabrikam-vg
export sat_name=fabrikamtestdeployments
export sa_partition_key="integration-test"
services_dir=services
mono_repo_dir=fabrikam2019
helm_charts_dir=fabrikam-helm-charts
services_full_dir="$TEST_WORKSPACE/$mono_repo_dir/$services_dir"

shopt -s expand_aliases
alias spk=$SPK_LOCATION
echo "SPK Version: $(spk --version)"

echo "Running from $(pwd)"
if [ -d "$TEST_WORKSPACE"  ]; then rm -Rf $TEST_WORKSPACE; fi

if [ ! -d "$TEST_WORKSPACE" ]; then
  echo "Directory '$TEST_WORKSPACE' does not exist"
  mkdir $TEST_WORKSPACE
  echo "Created '$TEST_WORKSPACE'"
fi

##################################
# Helm Chart template Setup START
##################################
cp helm-artifacts/* $TEST_WORKSPACE
# --------------------------------

cd $TEST_WORKSPACE

##################################
# Manifest Repo Setup START
##################################
mkdir $manifests_dir
cd $manifests_dir
git init
touch README.md
echo "This is the Flux Manifest Repository." >> README.md
file_we_expect=("README.md")
validate_directory "$TEST_WORKSPACE/$manifests_dir" "${file_we_expect[@]}"

git add -A

# See if the remote repo exists
repo_exists $AZDO_ORG_URL $AZDO_PROJECT $manifests_dir

# Create the remote repo for the local repo
created_repo_result=$(az repos create --name "$manifests_dir" --org $AZDO_ORG_URL --p $AZDO_PROJECT)

# Extract out remote repo URL from the above result
remote_repo_url=$(echo $created_repo_result | jq '.remoteUrl' | tr -d '"' )
echo "The remote_repo_url is $remote_repo_url"

# Remove the user from the URL
repo_url=$(getHostandPath "$remote_repo_url")
manifest_repo_url=$repo_url

# We need to manipulate the remote url to insert a PAT token so we can add an origin git url
git commit -m "inital commit"
# git remote rm origin
git remote add origin https://service_account:$ACCESS_TOKEN_SECRET@$repo_url
echo "git push"
git push -u origin --all
# --------------------------------

##################################
# HLD Repo Setup START
##################################
cd $TEST_WORKSPACE
mkdir $hld_dir
cd $hld_dir
git init
spk hld init
touch component.yaml
file_we_expect=("spk.log" "manifest-generation.yaml" "component.yaml" ".gitignore")
validate_directory "$TEST_WORKSPACE/$hld_dir" "${file_we_expect[@]}"

git add -A

# See if the remote repo exists
repo_exists $AZDO_ORG_URL $AZDO_PROJECT $hld_dir

# Create the remote repo for the local repo
created_repo_result=$(az repos create --name "$hld_dir" --org $AZDO_ORG_URL --p $AZDO_PROJECT)

# Extract out remote repo URL from the above result
remote_repo_url=$(echo $created_repo_result | jq '.remoteUrl' | tr -d '"' )
echo "The remote_repo_url is $remote_repo_url"

# Remove the user from the URL
repo_url=$(getHostandPath "$remote_repo_url")
hld_repo_url=$repo_url

# We need to manipulate the remote url to insert a PAT token so we can add an origin git url
git commit -m "inital commit"
# git remote rm origin
git remote add origin https://service_account:$ACCESS_TOKEN_SECRET@$repo_url
echo "git push"
git push -u origin --all
# --------------------------------

##################################
# HLD to Manifest Pipeline Setup Start
##################################
cd $TEST_WORKSPACE
# First we should check hld pipelines exist. If there is a pipeline with the same name we should delete it
hld_to_manifest_pipeline_name=$hld_dir-to-$manifests_dir
pipeline_exists $AZDO_ORG_URL $AZDO_PROJECT $hld_to_manifest_pipeline_name

# Create the hld to manifest pipeline
echo "hld_dir $hld_dir"
echo "hld_repo_url $hld_repo_url"
echo "manifest_repo_url $manifest_repo_url"
spk hld install-manifest-pipeline -o $AZDO_ORG -d $AZDO_PROJECT -p $ACCESS_TOKEN_SECRET -u https://$hld_repo_url -m https://$manifest_repo_url >> $TEST_WORKSPACE/log.txt

# Verify hld to manifest pipeline was created
pipeline_created=$(az pipelines show --name $hld_to_manifest_pipeline_name --org $AZDO_ORG_URL --p $AZDO_PROJECT)

# Verify hld to manifest pipeline run was successful
verify_pipeline_with_poll $AZDO_ORG_URL $AZDO_PROJECT $hld_to_manifest_pipeline_name 300 15

##################################
# External Helm Chart Repo Setup START
# uncomment when we can handle private helm chart repos seamlessly in SPK
##################################
# cd $TEST_WORKSPACE
# create_helm_chart_repo $helm_charts_dir $FrontEnd $TEST_WORKSPACE $ACR_NAME
# cd "$TEST_WORKSPACE/$helm_charts_dir"
# git add -A

# # See if the remote repo exists
# repo_exists $AZDO_ORG_URL $AZDO_PROJECT $helm_charts_dir
# push_remote_git_repo $AZDO_ORG_URL $AZDO_PROJECT $helm_charts_dir
# --------------------------------

##################################
# App Mono Repo Setup START
##################################
cd $TEST_WORKSPACE
mkdir $mono_repo_dir
cd $mono_repo_dir
git init

mkdir $services_dir
spk project init >> $TEST_WORKSPACE/log.txt
file_we_expect=("spk.log" ".gitignore" "bedrock.yaml" "maintainers.yaml" "hld-lifecycle.yaml")
validate_directory "$TEST_WORKSPACE/$mono_repo_dir" "${file_we_expect[@]}"

# Does variable group already exist? Delete if so
variable_group_exists $AZDO_ORG_URL $AZDO_PROJECT $vg_name "delete"

# Create variable group
spk project create-variable-group $vg_name -r $ACR_NAME -d $hld_repo_url -u $SP_APP_ID -t $SP_TENANT -p $SP_PASS --org-name $AZDO_ORG --project $AZDO_PROJECT --personal-access-token $ACCESS_TOKEN_SECRET  >> $TEST_WORKSPACE/log.txt

# Verify the variable group was created. Fail if not
variable_group_exists $AZDO_ORG_URL $AZDO_PROJECT $vg_name "fail"

# Introspection Storage Account Setup
storage_account_exists $AZ_STORAGE_ACCOUNT $AZ_RESOURCE_GROUP "fail"
storage_account_cors_enabled $AZ_STORAGE_ACCOUNT "enable"
storage_account_cors_enabled $AZ_STORAGE_ACCOUNT "wait"
storage_account_table_exists $sat_name $AZ_STORAGE_ACCOUNT "create"
storage_account_table_exists $sat_name $AZ_STORAGE_ACCOUNT "fail"
sa_access_key=$(az storage account keys list -n $AZ_STORAGE_ACCOUNT -g $AZ_RESOURCE_GROUP | jq '.[0].value')

# Add introspection variables to variable group
variable_group_id=$(az pipelines variable-group list --org $AZDO_ORG_URL -p $AZDO_PROJECT | jq '.[] | select(.name=="'$vg_name'") | .id')
variable_group_variable_create $variable_group_id $AZDO_ORG_URL $AZDO_PROJECT "INTROSPECTION_ACCOUNT_KEY" $sa_access_key "secret"
variable_group_variable_create $variable_group_id $AZDO_ORG_URL $AZDO_PROJECT "INTROSPECTION_ACCOUNT_NAME" $AZ_STORAGE_ACCOUNT
variable_group_variable_create $variable_group_id $AZDO_ORG_URL $AZDO_PROJECT "INTROSPECTION_PARTITION_KEY" $sa_partition_key
variable_group_variable_create $variable_group_id $AZDO_ORG_URL $AZDO_PROJECT "INTROSPECTION_TABLE_NAME" $sat_name

# Set up internal helm chart
chart_app_name=$FrontEnd
acr_name=$ACR_NAME
create_helm_chart_v2 $TEST_WORKSPACE
cd "$TEST_WORKSPACE/$mono_repo_dir"

# Commented code below is for external repo helm charts. Currently doesn't work.

# helm_repo_url="$AZDO_ORG_URL/$AZDO_PROJECT/_git/$helm_charts_dir"
local_repo_url="$AZDO_ORG_URL/$AZDO_PROJECT/_git/$mono_repo_dir"
spk service create $FrontEnd -d $services_dir -p "chart" -g $local_repo_url -b master >> $TEST_WORKSPACE/log.txt
# spk service create $FrontEnd -d $services_dir -p "$FrontEnd/chart" -g $helm_repo_url -b master >> $TEST_WORKSPACE/log.txt
directory_to_check="$services_full_dir/$FrontEnd"
file_we_expect=(".gitignore" "build-update-hld.yaml" "Dockerfile" )
validate_directory $directory_to_check "${file_we_expect[@]}"

# TODO uncomment this when helm chart fixed
# spk service create $BackEnd -d $services_dir -p "$BackEnd/chart" -g $helm_repo_url -b master >> $TEST_WORKSPACE/log.txt
# validate_directory "$services_full_dir/$BackEnd" "${file_we_expect[@]}"

git add -A

# TODO: We aren't using the config file right now
# spk init -f $SPK_CONFIG_FILE

# See if the remote repo exists
repo_exists $AZDO_ORG_URL $AZDO_PROJECT $mono_repo_dir

# Create the remote repo for the local repo
created_repo_result=$(az repos create --name "$mono_repo_dir" --org $AZDO_ORG_URL --p $AZDO_PROJECT)

# Extract out remote repo URL from the above result
remote_repo_url=$(echo $created_repo_result | jq '.remoteUrl' | tr -d '"' )
echo "The remote_repo_url is $remote_repo_url"

# Remove the user from the URL
repo_url=$(getHostandPath "$remote_repo_url")

# We need to manipulate the remote url to insert a PAT token so we can

git commit -m "inital commit"
git remote add origin https://service_account:$ACCESS_TOKEN_SECRET@$repo_url
echo "git push"
git push -u origin --all
# --------------------------------

##################################
# App Mono Repo LIFECYCLE Pipeline Setup START
##################################
# First we should check lifecycle pipelines exist. If there is a pipeline with the same name we should delete it
lifecycle_pipeline_name="$mono_repo_dir-lifecycle"
pipeline_exists $AZDO_ORG_URL $AZDO_PROJECT $lifecycle_pipeline_name

# Deploy lifecycle pipeline and verify it runs.
spk project install-lifecycle-pipeline --org-name $AZDO_ORG --devops-project $AZDO_PROJECT --repo-url $repo_url --pipeline-name $lifecycle_pipeline_name --personal-access-token $ACCESS_TOKEN_SECRET  >> $TEST_WORKSPACE/log.txt

# TODO: Verify the lifecycle pipeline sucessfully runs
# Verify lifecycle pipeline was created
pipeline_created=$(az pipelines show --name $lifecycle_pipeline_name --org $AZDO_ORG_URL --p $AZDO_PROJECT)

# Verify lifecycle pipeline run was successful
verify_pipeline_with_poll $AZDO_ORG_URL $AZDO_PROJECT $lifecycle_pipeline_name 180 15

# Approve pull request from lifecycle pipeline
echo "Finding pull request that $lifecycle_pipeline_name pipeline created..."
approve_pull_request $AZDO_ORG_URL $AZDO_PROJECT "Reconciling HLD"
# --------------------------------

##################################
# App Mono Repo BUILD Pipeline Setup START
##################################

# First we should check what service build & update pipelines exist. If there is a pipeline with the same name we should delete it
frontend_pipeline_name="$FrontEnd-pipeline"
pipeline_exists $AZDO_ORG_URL $AZDO_PROJECT $frontend_pipeline_name

# Create a pipeline since the code exists in remote repo
spk service install-build-pipeline -o $AZDO_ORG -u $remote_repo_url -d $AZDO_PROJECT -l $services_dir -p $ACCESS_TOKEN_SECRET -n $frontend_pipeline_name -v $FrontEnd  >> $TEST_WORKSPACE/log.txt

# Verify frontend service pipeline was created
pipeline_created=$(az pipelines show --name $frontend_pipeline_name --org $AZDO_ORG_URL --p $AZDO_PROJECT)

# Verify frontend service pipeline run was successful
verify_pipeline_with_poll $AZDO_ORG_URL $AZDO_PROJECT $frontend_pipeline_name 300 15

echo "Finding pull request that $frontend_pipeline_name pipeline created..."
approve_pull_request $AZDO_ORG_URL $AZDO_PROJECT "Updating $FrontEnd image tag to master"
# --------------------------------

##################################
# App Mono Repo Service Revision START
##################################

echo "Creating service revision"
git branch $branchName
git checkout $branchName
echo "# My New Added File" >> myNewFile.md
git add myNewFile.md
git commit -m "Adding my new file"
git push --set-upstream origin $branchName

# Create a PR for the change
current_time=$(date +"%Y-%m-%d-%H-%M-%S")
pr_title="Automated Test PR $current_time"
echo "Creating pull request: '$pr_title'"
spk service create-revision -t "$pr_title" -d "Adding my new file" --org-name $AZDO_ORG --personal-access-token $ACCESS_TOKEN_SECRET --remote-url $remote_repo_url >> $TEST_WORKSPACE/log.txt

echo "Attempting to approve pull request: '$pr_title'"
# Get the id of the pr created and set the PR to be approved
approve_pull_request $AZDO_ORG_URL $AZDO_PROJECT "$pr_title"
# --------------------------------

# ##################################
# TODO 
# Fix issues where image tag update not reflected in manifest yaml
# Verify the lifecycle pipeline runs after above PR is approved. 
# LifeCycle generates a PR on the HLD.
# Approve that PR too. That in turn with kick off the manifest pipeline. 
# Verify manifest repo after that.
# Eventually add rings as some stage....
# --------------------------------

echo "Successfully reached the end of the service validations scripts."

# ##################################
# # SPK Introspection Validation START
# ##################################

cd $TEST_WORKSPACE
cd ..
if [ -d "tests" ]; then
  cd tests
fi
export sa_access_key=$(echo "$sa_access_key" | tr -d '"')
spk init -f ./spk-config-test.yaml
export output=$(spk deployment get -o json > file.json )
length=$(cat file.json | jq 'length')
if (( length > 0 )); then
  echo "$length deployments were returned by spk deployment get"
else
  echo "Error: Empty JSON was returned from spk deployment get"
  exit 1
fi

# Compare $pipeline_id with the data returned by get.
pipeline1id=$(az pipelines build list --definition-ids $pipeline_id --organization $AZDO_ORG_URL --project $AZDO_PROJECT | jq '.[0].id')
listofIds=$(cat file.json | jq '.[].srcToDockerBuild.id')

if [[ $listofIds == *"$pipeline1id"* ]]; then
  echo "Pipeline Id $pipeline1id exists. Verified that data exists in storage and could be retrieved."
else
  echo "Error: Pipeline Id $pipeline1id is not found in data returned from get. "
  exit 1
fi
# --------------------------------

echo "Successfully reached the end of spk deployment get tests."