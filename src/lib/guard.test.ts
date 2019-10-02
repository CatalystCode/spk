import { guardNotEmpty, guardNotNull, guardTypeOf } from "./guard";

describe("Guard", () => {
  function methodWithRequiredName(name: string) {
    guardNotEmpty(name);
  }

  function methodWithRequiredNameWithParam(name: string) {
    guardNotEmpty(name, "name", "Name is required");
  }

  function methodWithRequiredObject(options: any) {
    guardNotNull(options);
  }

  describe("guardNotEmpty", () => {
    it("throws error on empty value", () => {
      expect(() => methodWithRequiredName("")).toThrowError();
    });

    it("throw error on whitespace", () => {
      expect(() => methodWithRequiredName(" ")).toThrowError();
    });

    it("does not throw error on valid value", () => {
      expect(() => methodWithRequiredName("valid")).not.toThrowError();
    });

    it("throws specific error message", () => {
      expect(() => methodWithRequiredNameWithParam("")).toThrowError(
        "Name is required"
      );
    });
  });

  describe("guardNotNull", () => {
    it("throws error on null value", () => {
      expect(() => methodWithRequiredObject(null)).toThrowError();
    });

    it("does not throw error on valid value", () => {
      expect(() => methodWithRequiredObject({})).not.toThrowError();
    });
  });

  describe("guardTypeOf", () => {
    const expectedType = "string";
    it("throws error on incorrect type", () => {
      expect(() => guardTypeOf(2, expectedType)).toThrowError();
    });

    it("does not throw error on valid value", () => {
      expect(() => guardTypeOf("hello", expectedType)).not.toThrowError();
    });
  });
});
