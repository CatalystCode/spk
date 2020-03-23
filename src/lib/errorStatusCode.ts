// please do not change the status code numbers
// you can add new ones but not changing the existing ones

export const errorStatusCode = {
  1000: "command fails to execute",
  1001: "validation error",
  1002: "execution error",
  1010: "environment related error",
  1100: "git operation related error",
};

export const isValid = (code: number): boolean => {
  return code in errorStatusCode;
};
