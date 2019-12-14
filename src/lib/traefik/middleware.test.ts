import { TraefikMiddleware } from "./middleware";

describe("TraefikIngressRoute", () => {
  test("the right name with service name is created", () => {
    const middlewareWithoutRing = TraefikMiddleware("my-service", "", [
      "/home",
      "/info",
      "/data"
    ]);
    expect(middlewareWithoutRing.metadata.name).toBe("my-service");
    expect(middlewareWithoutRing.metadata.namespace).toBe(undefined);
    expect(middlewareWithoutRing.spec.stringPrefix.forceSlash).toBe(false);
    expect(middlewareWithoutRing.spec.stringPrefix.prefixes.length).toBe(3);
    expect(middlewareWithoutRing.spec.stringPrefix.prefixes[0]).toBe("/home");
    expect(middlewareWithoutRing.spec.stringPrefix.prefixes[1]).toBe("/info");
    expect(middlewareWithoutRing.spec.stringPrefix.prefixes[2]).toBe("/data");

    const middlewareWithRing = TraefikMiddleware("my-service", "prod", [
      "/home"
    ]);
    expect(middlewareWithRing.metadata.name).toBe("my-service-prod");
    expect(middlewareWithRing.spec.stringPrefix.prefixes.length).toBe(1);
    expect(middlewareWithRing.spec.stringPrefix.prefixes[0]).toBe("/home");
  });

  test("optional parameters", () => {
    const middlewareWithRing = TraefikMiddleware(
      "my-service",
      "prod",
      ["/home", "/away"],
      { forceSlash: true, namespace: "prod-ring" }
    );
    expect(middlewareWithRing.metadata.name).toBe("my-service-prod");
    expect(middlewareWithRing.metadata.namespace).toBe("prod-ring");
    expect(middlewareWithRing.spec.stringPrefix.forceSlash).toBe(true);
    expect(middlewareWithRing.spec.stringPrefix.prefixes.length).toBe(2);
    expect(middlewareWithRing.spec.stringPrefix.prefixes[0]).toBe("/home");
    expect(middlewareWithRing.spec.stringPrefix.prefixes[1]).toBe("/away");
  });
});
