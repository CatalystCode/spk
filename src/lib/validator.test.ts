import {
  hasValue,
  isInteger,
  isPortNumber,
  validateForNonEmptyValue
} from "./validator";

describe("Tests on validator helper functions", () => {
  it("Test hasValue function", () => {
    expect(hasValue("")).toBe(false);
    expect(hasValue(undefined)).toBe(false);
    expect(hasValue(null)).toBe(false);

    expect(hasValue(" ")).toBe(true);
    expect(hasValue(" b ")).toBe(true);
    expect(hasValue(" a ")).toBe(true);
  });
  it("Test isInteger function", () => {
    expect(isInteger("")).toBe(false);
    expect(isInteger(undefined)).toBe(false);
    expect(isInteger(null)).toBe(false);

    expect(isInteger("-10")).toBe(false);
    expect(isInteger("+10")).toBe(false);
    expect(isInteger("010")).toBe(false);
    expect(isInteger("10.0")).toBe(false);
    expect(isInteger("80")).toBe(true);
  });
  it("Test isPortNumber function", () => {
    expect(isPortNumber("")).toBe(false);
    expect(isPortNumber(undefined)).toBe(false);
    expect(isPortNumber(null)).toBe(false);

    expect(isPortNumber("-10")).toBe(false);
    expect(isPortNumber("+10")).toBe(false);
    expect(isPortNumber("010")).toBe(false);
    expect(isPortNumber("10.0")).toBe(false);
    expect(isPortNumber("80")).toBe(true);
    expect(isPortNumber("8080")).toBe(true);
    expect(isPortNumber("0")).toBe(false);
    expect(isPortNumber("65536")).toBe(false);
  });
  it("Test validateForNonEmptyValue function", () => {
    // expect "error" to be returned
    ["", undefined, null].forEach(val => {
      expect(
        validateForNonEmptyValue({
          error: "error",
          value: val
        })
      ).toBe("error");
    });
    // expect "" to be returned
    ["", undefined, null].forEach(val => {
      expect(
        validateForNonEmptyValue({
          error: "",
          value: val
        })
      ).toBe("");
    });
    // positive tests
    [" ", " b ", "a"].forEach(val => {
      expect(
        validateForNonEmptyValue({
          error: "",
          value: val
        })
      ).toBe("");
    });
    [" ", " b ", "a"].forEach(val => {
      expect(
        validateForNonEmptyValue({
          error: "error",
          value: val
        })
      ).toBe("");
    });
  });
});
