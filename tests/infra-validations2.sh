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
AZDO_ORG_URL="${AZDO_ORG_URL:-"https://dev.azure.com/$AZDO_ORG"}"

echo "TEST_WORKSPACE: $TEST_WORKSPACE"
echo "SPK_LOCATION: $SPK_LOCATION"
echo "AZDO_PROJECT: $AZDO_PROJECT"
echo "AZDO_ORG: $AZDO_ORG"
echo "AZDO_ORG_URL: $AZDO_ORG_URL"
echo "ACR_NAME: $ACR_NAME"
echo "ACCESS_TOKEN_SECRET: $ACCESS_TOKEN_SECRET" ## DEBUG
echo "ARM_SUBSCRIPTION_ID: 7060bca0-7a3c-44bd-b54c-4bb1e9facfac"## Debug


terraform_template_dir=discovery-tf-template
tf_template_version=v0.0.1
infra_hld_version=v0.0.1
infra_hld_dir=discovery-infra-hld
infra_region=west/
services_full_dir="$TEST_WORKSPACE/$mono_repo_dir/$services_dir"
vg_name='spk-infra-hld-vg'
generate_pipeline_path="$(pwd)/infra-generation-pipeline.yml"

validation_test_yaml="rg_name: <insert value>"

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

cd $TEST_WORKSPACE

# Setup simple TF Template Repo ------------------
mkdir $terraform_template_dir
cd $terraform_template_dir
git init
mkdir template
cd template

# Configure Validation Terraform files
tfTemplate=$'resource "azurerm_resource_group" "example"{\n name= "${var.rg_name}"\n location = "${var.rg_location}"\n}'
tfVars=$'variable "rg_name" { \n type = "string" \n } \n variable "rg_location" { \n type = "string" \n }'
backendTfVars=$'storage_account_name="<storage account name>"'
touch main.tf variables.tf backend.tfvars
echo "$tfVars" >> variables.tf
echo "$backendTfVars" >> backend.tfvars
echo "$tfTemplate" >> main.tf
file_we_expect=("variables.tf" "main.tf" "backend.tfvars")
validate_directory "$TEST_WORKSPACE/$terraform_template_dir/template" "${file_we_expect[@]}" >> $TEST_WORKSPACE/log.txt

# The TF Template requires a git release for a version to be targeted for spk scaffold
git add -A

# See if the remote repo exists
repo_exists $AZDO_ORG_URL $AZDO_PROJECT $terraform_template_dir

# Create the remote terraform template repo for the local repo
created_repo_result=$(az repos create --name "$terraform_template_dir" --org $AZDO_ORG_URL --p $AZDO_PROJECT) >> $TEST_WORKSPACE/log.txt

# Extract out remote repo URL from the above result
remote_repo_url=$(echo $created_repo_result | jq '.remoteUrl' | tr -d '"' )
echo "The remote_repo_url is $remote_repo_url"

# Remove the user from the URL
repo_url=$(getHostandPath "$remote_repo_url")

git commit -m "inital commit"
git tag "$tf_template_version"

# git remote rm origin
source=https://infra_account:$ACCESS_TOKEN_SECRET@$repo_url 
echo "Source: $source" ##DEBUG
git remote add origin "$source"
echo "git push"
git push -u origin --all
git push origin "$tf_template_version"

# Scaffold an Infra-HLD repo from TF Template ------------------
cd ../..
# Single Cluster scaffold for template
pwd
echo "../$terraform_template_dir"
echo "$tf_template_version"
echo "Source: $source" ##DEBUG

spk infra scaffold -n $infra_hld_dir --source "$source" --version "$tf_template_version" --template "template" >> $TEST_WORKSPACE/log.txt

# Validate the definition in the Infra-HLD repo ------------------
file_we_expect=("definition.yaml")
validate_directory "$TEST_WORKSPACE/$infra_hld_dir" "${file_we_expect[@]}"

# Validate the contents of the definition.yaml
validate_file "$TEST_WORKSPACE/$infra_hld_dir/definition.yaml" $validation_test_yaml >> $TEST_WORKSPACE/log.txt

# Setup region deployment example within the Infra HLD Repo ------------------
spk infra scaffold -n $infra_hld_dir/$infra_region --source "$source" --version "$tf_template_version" --template "template" >> $TEST_WORKSPACE/log.txt


# Create remote repo for Infra HLD ------------------
cd $infra_hld_dir

# Add pipeline yml fo generation verification
echo "Copying generate pipeline validation yml to Infra HLD repo"
echo "This is the path : $generate_pipeline_path" # Debug
cp $generate_pipeline_path .
ls # Debug

git init

# The HLD Template requires a git release for a version to be targeted for spk scaffold
git add -A

# See if the remote repo exists
repo_exists $AZDO_ORG_URL $AZDO_PROJECT $infra_hld_dir

# Create the remote terraform template repo for the local repo
created_repo_result=$(az repos create --name "$infra_hld_dir" --org $AZDO_ORG_URL --p $AZDO_PROJECT) >> $TEST_WORKSPACE/log.txt

# Extract out remote repo URL from the above result
remote_repo_url=$(echo $created_repo_result | jq '.remoteUrl' | tr -d '"' )
echo "The remote_repo_url is $remote_repo_url"

# Remove the user from the URL
repo_url=$(getHostandPath "$remote_repo_url")

git commit -m "inital commit"
git tag "$infra_hld_version"

# git remote rm origin
infra_source=https://infra_account:$ACCESS_TOKEN_SECRET@$repo_url 
echo "Source: $source" ##DEBUG
git remote add origin "$infra_source"
echo "git push"
git push -u origin --all
git push origin "$infra_hld_version"

# Create VG for Generate Validation Pipeline

# Does variable group already exist? Delete if so
variable_group_exists $AZDO_ORG_URL $AZDO_PROJECT $vg_name "delete"

# Create variable group
az pipelines variable-group create --name $vg_name --authorize true --variables "ACCESS_TOKEN_SECRET=$ACCESS_TOKEN_SECRET" "ARM_CLIENT_ID=$SP_APP_ID" "ARM_CLIENT_SECRET=$SP_PASS" "ARM_SUBSCRIPTION_ID=Tentative" "ARM_TENANT_ID=$SP_TENANT" "CLUSTER=$infra_region" "GENERATED_REPO=https://infra_account:$ACCESS_TOKEN_SECRET@$repo_url" "PROJECT_DIRECTORY=$infra_hld_dir" "AZDO_ORG_NAME=$AZDO_ORG_URL" "AZDO_PROJECT_NAME=$AZDO_PROJECT" "ARM_SUBSCRIPTION_ID=7060bca0-7a3c-44bd-b54c-4bb1e9facfac"

#spk project create-variable-group $vg_name -r $ACR_NAME -d $repo_url -u $SP_APP_ID -t $SP_TENANT -p $SP_PASS --org-name $AZDO_ORG --project $AZDO_PROJECT --personal-access-token $ACCESS_TOKEN_SECRET  >> $TEST_WORKSPACE/log.txt

# Verify the variable group was created. Fail if not
variable_group_exists $AZDO_ORG_URL $AZDO_PROJECT $vg_name "fail"


# First we should check if the hld  Generate Pipeline exist. If there is a pipeline with the same name we should delete it
hld_generate_pipeline=$infra_hld_dir-generate-pipeline
pipeline_exists $AZDO_ORG_URL $AZDO_PROJECT $hld_generate_pipeline

# Create Generate Pipeline for Validation of spk infra generate
echo "Creating Pipeline" #Debug
az pipelines create --name $hld_generate_pipeline --description "Pipeline for validating spk infra generate" --repository $infra_hld_dir --branch "master" --repository-type "tfsgit" --yml-path "infra-generation-pipeline.yml"

# Verify spk infra generate pipeline was created
echo "Verify Created Pipeline"  #Debug
pipeline_created=$(az pipelines show --name $hld_generate_pipeline --org $AZDO_ORG_URL --p $AZDO_PROJECT)

# Verify lifecycle pipeline run was successful
echo "Polling for pipeline success"  #Debug
verify_pipeline_with_poll $AZDO_ORG_URL $AZDO_PROJECT $hld_generate_pipeline 360 15

# Check for PR
# Check Repo for TF Files

echo "Successfully reached the end of the infrastructure validations script."