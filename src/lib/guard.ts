/**
 * Validates the string express is not null or empty, otherwise throws an exception
 * @param value - The value to validate
 * @param paramName - The name of the parameter to validate
 * @param message - The error message to return on invalid value
 */
export const guardNotEmpty = (
  value: string,
  paramName?: string,
  message?: string
) => {
  if (!!value === false || value.trim().length === 0) {
    message = message || `'${paramName || "value"}' cannot be null or empty`;
    throw new Error(message);
  }
};

/**
 * Validates the value is not null, otherwise throw an exception
 * @param value - The value to validate
 * @param paramName - The name of the parameter to validate
 * @param message - The error message to return on invalid value
 */
export const guardNotNull = (
  value: any,
  paramName?: string,
  message?: string
) => {
  if (!!value === false) {
    message =
      message || `'${paramName || "value"}' cannot be null or undefined`;
    throw new Error(message);
  }
};

export const guardTypeOf = (value: any, type: string, message?: string) => {
  if (typeof value !== type) {
    message =
      message || `${value} must be of type ${type}, ${typeof value} given`;
    throw new Error(message);
  }
};
