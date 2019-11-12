type TraefikEntryPoints = Array<"web" | "web-secure">; // web === 80; web-secure === 443;

/**
 * Interface for a Traefik IngressRoute
 *
 * @see https://docs.traefik.io/routing/providers/kubernetes-crd/
 */
interface ITraefikIngressRoute {
  apiVersion: "traefik.containo.us/v1alpha1";
  kind: "IngressRoute";
  metadata: {
    name: string;
    namespace?: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
  };
  spec: {
    entryPoints?: TraefikEntryPoints; // defaults to allowing all traffic if not defined
    routes: Array<{
      match: string;
      kind: "Rule";
      priority?: number;
      middlewares?: Array<{ name: string }>;
      services: Array<{
        name: string;
        port: number;
        healthCheck?: {
          path: string;
          host: string;
          intervalSeconds: number;
          timeoutSeconds: number;
        };
        weight?: number;
        passHostHeader?: boolean;
        responseForwarding?: {
          flushInterval: string; // eg '100ms'
        };
        strategy?: "RoundRobin";
      }>;
    }>;
  };
}

/**
 * Factory to create a minimal Traefik IngressRoute with route rules
 * corresponding to a PathPrefix matching `/<serviceName>` and a header match
 * rule matching a `Ring` header to `<ringName>`.
 *
 * If `ringName` is an empty string, the header match rule is not included.
 *
 * @param serviceName name of the service to create the IngressRoute for
 * @param ringName name of the ring to which the service belongs
 * @param opts options to specify the manifest namespace and IngressRoute entryPoints
 */
export const TraefikIngressRoute = (
  serviceName: string,
  ringName: string,
  servicePort: number,
  opts: {
    namespace?: string;
    entryPoints?: TraefikEntryPoints;
    middlewares?: string[];
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
  } = {}
): ITraefikIngressRoute => {
  const {
    entryPoints,
    namespace,
    middlewares = [],
    labels = {},
    annotations = {}
  } = opts;
  const metadataName =
    ringName.length === 0 ? serviceName : `${serviceName}-${ringName}`; // if a ring was provided, append to service name with a dash ('-')
  const routeMatchPathPrefix = `PathPrefix(\`/${serviceName}\`)`;
  const routeMatchHeaders =
    ringName.length === 0 ? "" : `Headers(\`Ring\`, \`${ringName}\`)`; // no 'X-' prefix for header: https://tools.ietf.org/html/rfc6648
  const matchSpec = [routeMatchPathPrefix, routeMatchHeaders]
    .filter(matchRule => !!matchRule)
    .join(" && ");
  const metadataNamespace = !!namespace ? { namespace } : {};
  const specEntryPoints =
    !!entryPoints && entryPoints.length > 0 ? { entryPoints } : {};
  const specMiddlewares = middlewares.map(middlewareName => ({
    name: middlewareName
  }));

  return {
    apiVersion: "traefik.containo.us/v1alpha1",
    kind: "IngressRoute",
    metadata: {
      annotations,
      labels,
      name: metadataName,
      ...metadataNamespace
    },
    spec: {
      ...specEntryPoints,
      routes: [
        {
          kind: "Rule",
          match: matchSpec,
          middlewares: specMiddlewares,
          services: [
            {
              name: metadataName,
              port: servicePort
            }
          ]
        }
      ]
    }
  };
};
