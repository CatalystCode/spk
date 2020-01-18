/**
 * Values to be validated
 */
export interface IValidationValue {
  value: undefined | null | string;
  error: string;
}

/**
 * Returns true of val is undefined, null or empty string.
 *
 * @param val Value to inspect
 */
export const hasValue = (val: undefined | null | string): boolean => {
  return val !== undefined && val !== null && val !== "";
};

/**
 * Returns err if val is undefined, null or empty string. Returns
 * otherwise empty string.
 *
 * @param val Value to inspect
 * @param err Error message
 */
export const validateForNonEmptyValue = (
  validValue: IValidationValue
): string => {
  return hasValue(validValue.value) ? "" : validValue.error;
};
