import i18n from "./i18n.json";
import { isValid } from "./errorStatusCode";
import { logger } from "../logger";

const errors: { [key: string]: string } = i18n.errors;

interface ErrorChain {
  spkStatusCode: number;
  message: string;
  details?: string;
  parent?: ErrorChain;
}

interface ErrorParam {
  errorKey: string;
  values: string[];
}

const isErrorChainObject = (o: Error | ErrorChain): boolean => {
  return "spkStatusCode" in o;
};

/**
 * Returns formatted error message.
 *
 * @param errorInstance string or ErrorParam. latter is for
 *                      string substitution in error message
 */
export const getErrorMessage = (errorInstance: string | ErrorParam): string => {
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

  const oError: ErrorChain = {
    spkStatusCode: code,
    message: getErrorMessage(errorKey),
  };

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
 * Generates error messages and have them in messages array.
 *
 * @param error Error object
 * @param messages string of messages
 * @param padding Padding to be added to the beginning of messages
 */
export const message = (
  error: ErrorChain,
  messages: string[],
  padding?: string
): void => {
  padding = padding || "";
  let mes =
    `${padding}code: ${error.spkStatusCode}\n` +
    `${padding}message: ${error.message}`;
  if (error.details) {
    mes += `\n${padding}details: ${error.details}`;
  }

  messages.push(mes);
  if (error.parent) {
    message(error.parent, messages, padding + "  ");
  }
};

/**
 * Writing error log.
 *
 * @param err Error object
 */
export const log = (err: Error | ErrorChain): void => {
  if (isErrorChainObject(err)) {
    const messages: string[] = [];
    message(err as ErrorChain, messages);
    logger.error("\n" + messages.join("\n"));
  } else {
    logger.error(err);
  }
};
