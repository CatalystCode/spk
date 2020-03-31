# Bring your own build step

## Summary

This document attempts to describe a number of ways in which we may alter `spk`
to accomodate for a custom build step, and bring their own custom build steps.

## Proposal

### Bring your own build step for building sources and container images

Authors: Bhargav Nookala

| Revision | Date        | Author          | Remarks       |
| -------: | ----------- | --------------- | ------------- |
|      0.1 | 03-30, 2020 | Bhargav Nookala | Initial Draft |

### Overview

This document presents a few proposed methods on how an `spk` user can leverage
future work to use `spk` to bring their own build steps for their applications.

### Out of Scope

This document does not describe modifications or alterations for any other
pipeline except for the service build-update-hld pipeline.

### Design Details

For applications that provide a dockerfile that require a source build step, the
current `spk` build-update-hld pipeline is not sufficient. Take, for example, a
Dockerfile that presumes the following:

1. An argument to be passed to the docker build step via `docker build`
2. One (or many) artifacts to be built from sources tracked in a git repostiory.

Such a Dockerfile could appear as the one below:

```docker
FROM openjdk:8-jdk-alpine
VOLUME /tmp
ARG JAR_FILE
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

Presently, the `spk` build update hld pipelines make a number of presumptions on
how Docker images should be built, and how a build stage for an application
works.

- For a spring boot application (such as the one described in the Dockerfile
  above), it requires a build stage that produces an `app.jar` that can be
  copied into the container at container image _build time_

- For the existing set of build pipelines, our behavior is that a commit to a
  git source repository will trigger the build-update-hld pipeline and build the
  container image specified – for the sample container image above, the image
  build will likely fail as it requires a built `.jar` file to be copied into
  the container

  - **This is the problem we will try and solve in this document**

- Additionally, our current build update hld pipeline will also use
  `az acr build`, which uses a common platform (ACR build) to build a docker
  container image. This pushes the source folder up to the common build
  platform, and performs a “docker build” on it

  - While this has not caused any issue for us today, it does introduce a number
    of custom flags/configurations that are `acr build` specific - if a user is
    familiar with `docker` commands but not `az acr build`, it introduces a
    challenge point - as our pipeline performs an `az acr build` - with no
    specific arguments.

- As we do not pass any parameters to `az acr build`, this becomes an issue as
  some Dockerfiles might require build arguments to be passed in ie the `ARG`
  directive.
  - This work is currently being tracked by
    https://github.com/CatalystCode/spk/blob/yvonne.designDoc/technical-docs/designs/services/acrBuildArguments.md

### Status Quo

The current build-update-hld pipeline is a multi-stage pipeline that consists of
two stages:

- The first stage:

  - Runs `az acr build` (which pushes the source repository to acr and builds a
    container image)

- The second stage:
  - Is triggered on the success of the first stage of the pipeline.
  - Updates HLD, creates a Pull Request etc.

This document relates to the build stage of the container image (ie: the first
stage). The relevant steps of the first stage of the pipeline are as follows.

```sh
    export BUILD_REPO_NAME=${BUILD_REPO_NAME(serviceName)}
    export IMAGE_TAG=${IMAGE_TAG}
    export IMAGE_NAME=$BUILD_REPO_NAME:$IMAGE_TAG
    cd ${relativeServiceForDockerfile}
    az acr build -r $(ACR_NAME) --image $IMAGE_NAME .
```

In which `IMAGE_TAG` is set by the following lines:

```bash
export const IMAGE_TAG = `${SAFE_SOURCE_BRANCH}-$(Build.BuildNumber)`;
```

### Some proposed approaches

There are a few ways we can resolve this:

##### Pre “docker-build” task to compile application sources

- This would involve a task scaffolded via spk that would be inserted before the
  “acr build” task ie a “source build” task.

  - Would compile any application sources into an artifact, and place it
    somewhere (pipeline artifacts, blob storage, etc.)

  - a simple example using pipeline artifacts:

  ```sh
    mvn clean install
    az pipelines runs artifact upload --artifact-name 'app' --path /path/to/app.jar
  ```

- An `acr build` task would only execute on the success of source build (ie
  building the app.jar)

  - This would consume an artifact produced in a “source build” step to be
    re-used as an argument for the “docker-build” step – see the sample
    Dockerfile shared above.

  - a simple example using pipeline artifacts, presuming a novel implementation
    of build arguments:

  ```sh

  az pipelines runs artifact download --artifact-name 'app' --path /path/to/app.jar

  export BUILD_REPO_NAME=${BUILD_REPO_NAME(serviceName)}
  export IMAGE_TAG=${IMAGE_TAG}
  export IMAGE_NAME=$BUILD_REPO_NAME:$IMAGE_TAG
  cd ${relativeServiceForDockerfile}

  az acr build -r $(ACR_NAME) --image $IMAGE_NAME --build-arg JAR_FILE=app.jar .
  ```

##### “Bring your own build task” scaffolded via SPK

- This is the most "versatile" solution as the build task can be as complicated
  as it needs to be – we assume any user provided script does the necessary work
  of building sources, building a container image, any other validation steps,
  and finally pushing the container image to ACR

- A single task that consists of building and pushing to a container registry
  all scaffolded into the pipeline from configuration provided via bedrock.yaml

  - A user provides the script location in bedrock.yaml – which is read in and
    written to the pipeline yaml and executed at run-time, replacing the inline
    pipeline steps of running `az acr build` from above. This can be done at
    service creation time, at a users explicit approval:

    ```sh
    spk service create . --display-name "fabrikam" --build-scrip-path /path/to/script.sh
    ```

  - An example of a bedrock.yaml file containing a reference to a build script.
    The root service contains a relative path to the build script within the
    repository:

    ```yaml
    rings:
      dev:
        isDefault: true
    services:
      ./:
        displayName: "fabrikam"
        buildScriptPath: "path/to/build/script.sh" # relative build script location in the repository
        helm:
          chart:
            branch: master
            git: "https://dev.azure.com/fabrikam/frontend/_git/charts"
            path: frontend
        k8sBackend: "fabrikam-k8s-svc"
        k8sBackendPort: 80
        middlewares: []
        pathPrefix: "fabrikam-service"
        pathPrefixMajorVersion: "v1"
    variableGroups:
      - fabrikam-vg
    ```

  - Can we offer stricter guidance on what container image should be pushed by
    any script a user brings themselves?

    - One idea is to expose necessary environment variables ie `IMAGE_TAG`,
      `IMAGE_NAME`, `REPO_NAME`, then source and run the build script

      - We can ask that a user provides an entrypoint function in their
        user-provided build script that we call directly from the pipeline
        script ie a function named `build_update_container` after sourcing the
        build script ie:

      - The build-update-hld pipeline then becomes:

      ```sh
      export BUILD_REPO_NAME=${BUILD_REPO_NAME(serviceName)}
      export IMAGE_TAG=${IMAGE_TAG}
      export IMAGE_NAME=$BUILD_REPO_NAME:$IMAGE_TAG

      source path/to/build/script.sh
      build_update_container
      ```

      - In which we presume the script, path/to/build/script.sh resembles the
        following:

      ```sh
        function build_update_container {
          mvn clean install
          az acr build -r $(BUILD_REPO_NAME) --image $IMAGE_NAME --build-arg JAR_FILE=app.jar .
        }
      ```

    - This is unlikely to play nicely with custom build arguments as implemented
      by
      [this design](https://github.com/CatalystCode/spk/blob/yvonne.designDoc/technical-docs/designs/services/acrBuildArguments.md)
      but we can still utilize this for pipelines without a user defined build
      script.

##### Guidance on how the user can modify existing build-update-hld pipelines scaffolded by `spk`

- Any such guidance should cover an end to end on how to take an existing
  pipeline and modify it to include a build step to:
  1.  Build application sources,
  1.  Publish an artifact to a well-known location (Artifactory, Azure Blob
      Storage, Pipeline Artifacts, etc.)
  1.  Consume aforementioned artifact from well-known location in a Dockerfile.

### Dependencies

Custom build arguments:
https://github.com/CatalystCode/spk/blob/yvonne.designDoc/technical-docs/designs/services/acrBuildArguments.md

### Risks & Mitigations

We should be wary about executing "user provided" code, as it may potentially be
malicious.

### Documentation

1. How a user should modify existing pipelines scaffolded by `spk` via docs. to
   support the requests above.
