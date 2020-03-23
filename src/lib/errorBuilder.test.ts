import { build, log } from "./errorBuilder";

describe("test getErrorMessage function", () => {
  it("positive test: string", () => {
    const oErr = build(1000, "infra-100");
    expect(oErr.message).toBe(
      "infra-100: Scaffold Command was not successfully executed."
    );
  });
  it("positive test: object", () => {
    const oErr = build(1000, {
      errorKey: "infra-105",
      values: ["test"],
    });
    expect(oErr.message).toBe(
      "infra-105: Unable to find Terraform environment. Ensure template path test exists."
    );
  });
  it("negative test: invalid test", () => {
    const oErr = build(1000, "infra-100xxxxx");
    expect(oErr.message).toBe("infra-100xxxxx");
  });
});

describe("test build function", () => {
  it("negative test: invalid code", () => {
    expect(() => {
      build(-1, "infra-1000");
    }).toThrow();
  });
  it("positive test: without error", () => {
    const err = build(1000, "infra-100");
    expect(err.errorCode).toBe(1000);
    expect(err.message).toBe(
      "infra-100: Scaffold Command was not successfully executed."
    );
    expect(err.details).toBeUndefined();
    expect(err.parent).toBeUndefined();
  });
  it("positive test: with Error", () => {
    const err = build(1000, "infra-100", Error("test"));
    expect(err.errorCode).toBe(1000);
    expect(err.message).toBe(
      "infra-100: Scaffold Command was not successfully executed."
    );
    expect(err.details).toBe("test");
    expect(err.parent).toBeUndefined();
  });
  it("positive test: with ErrorChain", () => {
    const e = build(1000, "infra-101");
    const err = build(1000, "infra-100", e);
    expect(err.errorCode).toBe(1000);
    expect(err.message).toBe(
      "infra-100: Scaffold Command was not successfully executed."
    );
    expect(err.details).toBeUndefined();
    expect(err.parent).toStrictEqual(e);
  });
});

describe("test message function", () => {
  it("positive test: one error chain", () => {
    const messages: string[] = [];
    const oError = build(1000, "infra-101");
    oError.messages(messages);
    expect(messages).toStrictEqual([
      "code: 1000\nmessage: infra-101: Value for source is required because it cannot be constructed with properties in spk-config.yaml. Provide value for source.",
    ]);
  });
  it("positive test: one error chain with details", () => {
    const messages: string[] = [];
    const oError = build(1000, "infra-101", Error("test message"));
    oError.messages(messages);
    expect(messages).toStrictEqual([
      "code: 1000\nmessage: infra-101: Value for source is required because it cannot be constructed with properties in spk-config.yaml. Provide value for source.\ndetails: test message",
    ]);
  });
  it("positive test: multiple error chains", () => {
    const messages: string[] = [];
    const oError = build(
      1000,
      "infra-101",
      build(1001, "infra-102", build(1010, "infra-103"))
    );
    oError.messages(messages);
    expect(messages).toStrictEqual([
      "code: 1000\nmessage: infra-101: Value for source is required because it cannot be constructed with properties in spk-config.yaml. Provide value for source.",
      "  code: 1001\n  message: infra-102: Values for name, version and/or 'template were missing. Provide value for values for them.",
      "    code: 1010\n    message: infra-103: Unable to determine error when validating remote git source.",
    ]);
  });
});

describe("test log function", () => {
  it("test: Error chain object", () => {
    const oError = build(1000, "infra-100");
    expect(log(oError)).toBe(
      "\ncode: 1000\nmessage: infra-100: Scaffold Command was not successfully executed."
    );
  });
  it("test: Error object", () => {
    expect(log(Error("test message"))).toBe("test message");
  });
});
