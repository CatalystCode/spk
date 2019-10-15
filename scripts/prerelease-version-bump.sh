#!/bin/bash

RELEASE_BRANCH=$(whoami)/release

# get the latest from master, create a release branch
git checkout master
git pull
git checkout -b ${RELEASE_BRANCH}

# Do not tag commit
yarn config set version-git-tag false

# Commit message template
yarn config set version-git-message "release: Bump to v%s"

# Bump version following prerelease format => 1.0.0-0 becomes 1.0.0-1
yarn version --prerelease
git push origin ${RELEASE_BRANCH}
