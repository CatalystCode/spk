import i18n from "./i18n.json";
import { isValid } from "./errorStatusCode";
import { logger } from "../logger";

const errors: { [key: string]: string } = i18n.errors;

interface ErrorParam {
  errorKey: string;
  values: string[];
}
class ErrorChain extends Error {
  errorCode: number;
  details: string | undefined;
  parent: ErrorChain | undefined;

  constructor(code: number, errorInstance: string | ErrorParam) {
    super("");
    this.errorCode = code;
    this.message = this.getErrorMessage(errorInstance);
  }
  getErrorMessage(errorInstance: string | ErrorParam): string {
    let key = "";
    let values: string[] | undefined = undefined;

    if (typeof errorInstance === "object") {
      key = errorInstance.errorKey;
      values = errorInstance.values;
    } else {
      key = errorInstance;
    }

    if (key in errors) {
      let results = errors[key];
      if (values) {
        values.forEach((val, i) => {
          const re = new RegExp("\\{" + i + "}", "g");
          results = results.replace(re, val);
        });
      }
      return `${key}: ${results}`;
    }
    return key;
  }
  /**
   * Generates error messages and have them in messages array.
   *
   * @param error Error object
   * @param messages string of messages
   * @param padding Padding to be added to the beginning of messages
   */
  messages(results: string[], padding?: string): void {
    padding = padding || "";
    let mes =
      `${padding}code: ${this.errorCode}\n` +
      `${padding}message: ${this.message}`;
    if (this.details) {
      mes += `\n${padding}details: ${this.details}`;
    }

    results.push(mes);
    if (this.parent) {
      this.parent.messages(results, padding + "  ");
    }
  }
}

const isErrorChainObject = (o: Error | ErrorChain): boolean => {
  return o instanceof ErrorChain;
};

/**
 * Builds an error object
 *
 * @param code spk error code
 * @param errorKey Error key. e.g. "infra-101" or can be an object
 *                 to support string substitution in error message
 *                 {
 *                    errorKey: "infra-105",
 *                    values: ["someValue"]
 *                 }
 * @param error: Parent error object.
 */
export const build = (
  code: number,
  errorKey: string | ErrorParam,
  error?: Error | ErrorChain
): ErrorChain => {
  if (!isValid(code)) {
    throw Error(`Invalid status code, ${code}`);
  }

  const oError = new ErrorChain(code, errorKey);

  if (error) {
    if (isErrorChainObject(error)) {
      oError.parent = error as ErrorChain;
    } else {
      const e = error as Error;
      oError.details = e ? e.message : "";
    }
  }

  return oError;
};

/**
 * Writing error log.
 *
 * @param err Error object
 */
export const log = (err: Error | ErrorChain): string => {
  if (isErrorChainObject(err)) {
    const messages: string[] = [];
    (err as ErrorChain).messages(messages);
    const msg = "\n" + messages.join("\n");
    logger.error(msg);
    return msg;
  } else {
    logger.error(err.message);
    return err.message;
  }
};
