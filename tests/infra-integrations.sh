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


terraform_template_dir=discovery-tf-template
tf_template_version=v0.0.1
infra_hld_dir=discovery-infra-hld
vg_name=discovery-vg
services_dir=services
mono_repo_dir=discovery2019
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

cd $TEST_WORKSPACE

# Setup simple TF Tepmlate ------------------
mkdir $terraform_template_dir
cd $terraform_template_dir
git init
tfTemplate=$'resource "azurerm_resource_group" "example"{\n name= "${var.rg_name}"\n location = "${var.rg_location}"\n}'
tfVars=$'variable "rg_name" { \n type = "string" \n } \n variable "rg_location" { \n type = "string" \n }'
touch main.tf variables.tf
echo "$tfVars" >> variables.tf
echo "$tfTemplate" >> main.tf
file_we_expect=("variables.tf" "main.tf")
validate_directory "$TEST_WORKSPACE/$terraform_template_dir" "${file_we_expect[@]}"
# The TF Template requires a git release for a version to be targeted for spk scaffold
git add -A

# See if the remote repo exists
repo_exists $AZDO_ORG_URL $AZDO_PROJECT $terraform_template_dir

# Create the remote repo for the local repo
created_repo_result=$(az repos create --name "$terraform_template_dir" --org $AZDO_ORG_URL --p $AZDO_PROJECT)

# Extract out remote repo URL from the above result
remote_repo_url=$(echo $created_repo_result | jq '.remoteUrl' | tr -d '"' )
echo "The remote_repo_url is $remote_repo_url"

# Remove the user from the URL
repo_url=$(getHostandPath "$remote_repo_url")
manifest_repo_url=$repo_url

git commit -m "inital commit"
git tag "$tf_template_version"

# git remote rm origin
git remote add origin https://infra_account:$ACCESS_TOKEN_SECRET@$repo_url
echo "git push"
git push -u origin --all


# Scaffold an Infra-HLD repo from TF Template ------------------
cd ..
mkdir $infra_hld_dir
cd $infra_hld_dir
git init
# Single Cluster scaffold for template
pwd
echo "../$terraform_template_dir"
echo "$tf_template_version"
spk infra scaffold -n discovery-service -s "../$terraform_template_dir" -v "$tf_template_version" -t "."
