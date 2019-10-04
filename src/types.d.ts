/**
 * Maintainers file
 */
export interface IMaintainersFile {
  services: {
    [relativeDirectory: string]: {
      maintainers: IUser[];
      contributors?: IUser[];
    };
  };
}

interface IUser {
  name: string;
  email: string;
  website?: string;
}

export interface IHelmConfig {
  chart:
    | {
        repository: string; // repo (eg; https://kubernetes-charts-incubator.storage.googleapis.com/)
        chart: string; // chart name (eg; zookeeper)
      }
    | ({
        git: string; // git url to clone (eg; https://github.com/helm/charts.git)
        path: string; // path in the git repo to the directory containing the Chart.yaml (eg; incubator/zookeeper)
      } & (
        | {
            sha: string; // sha to checkout (eg; 4e61eb234b0ac38956efc1b52a0455a43dba026f)
            tag?: string; // indicate the semantics of the sha (eg; v1.0.2)
          }
        | {
            branch: string; // branch to checkout (eg; master)
          }
      ));
}

/**
 * Bedrock config file
 * Used to capture service meta-information regarding how to deploy
 */
export interface IBedrockFile {
  services: {
    [relativeDirectory: string]: {
      helm: IHelmConfig;
    };
  };
}

/**
 * Basic AzurePipelines Interface
 * @see https://github.com/andrebriggs/monorepo-example/blob/master/service-A/azure-pipelines.yml
 */
export interface IAzurePipelinesYaml {
  trigger?: {
    branches?: {
      include?: string[];
      exclude?: string[];
    };
    paths?: {
      include?: string[];
      exclude?: string[];
    };
  };
  variables?: {
    group?: string[];
  };
  pool?: {
    vmImage?: string;
  };
  steps?: Array<{
    displayName?: string;
    script?: string;
  }>;
}

export interface IConfigYaml {
  infra?: {
    terraform_check?: boolean;
    git_check?: boolean;
    helm_check?: boolean;
    az_cli_check?: boolean;
    env_var_check?: boolean;
    terraform?: string;
    helm?: string;
    git?: string;
    bedrock?: {
      source?: string;
      tag?: string;
      repo_type?: string;
      private_repo_key?: string;
    };
    azure?: {
      // TBD
    };
  };
  deployment?: {
    storage?: {
      account_name?: string;
      table_name?: string;
      key?: string;
      partition_key?: string;
    };
    pipeline?: {
      org?: string;
      project?: string;
      access_token?: string;
    };
  };
  services?: {
    // TBD
  };
}
