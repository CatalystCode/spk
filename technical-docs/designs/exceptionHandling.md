# Software Design Document

Reference: Exception Handling<br> Authors: Andre Briggs, Dennis Seah

| Revision | Date         | Author      | Remarks       |
| -------: | ------------ | ----------- | ------------- |
|      0.1 | Mar-04, 2020 | Dennis Seah | Initial Draft |

## 1. Overview

User of `spk` command line tool needs to have a better understanding of what
happened when command does not execute successfully. Currently, we output error
message to logs (using `winston logger`); and it is difficult to go through the
log entries to pinpoint the error. This is because error, warning and
information messages are interleaved.

The other problem is that in some cases, we drop the existing error message and
throw a new one. This results in losing the root cause of the error. For
instance

```
try {
  ...
} catch (err) {
  if (err.message.indexOf("VS123456")) {
    throw Error("Azure WebAPI call is not completed.")
  }
  throw err;
}
```

In some cases, we ignore the exception and move on. For instance

```
try {
  ...
} catch (err) {
  logger.error(err);
}
```

Reader of the code has a hard time understand why error is ignored.

## 2. Out of Scope

This document shall not cover exceptions/errors that are thrown by third parties
software and/or from Microsoft's client API (e.g. from Azure DevOps).

## 3. Proposal

### 3.1 Documenting harmless exception.

There are cases when we intentional ignore exceptions. For instance

```
  try {
    return !!(await coreAPI.getProject(name));
  } catch (_) {
    // exception is thrown because project is not found
    // this is not an error condition because we are
    // using this call to check if project exist or not.
    logger.info(`Unable to get project, ${name}`);
  }
  return false;
```

The proposal is to have adequate comments in the code to explain why exception
is caught and ignored. Typically, we do not advise people to do this unless we
are sure about it. Taking the example above, we can authentication and
authorization failures too.

### 3.2 Maintain Exception Chain.

Most of the time, we have a good idea of issues when we have the complete
exception chain. For instance

```
 o Command excecute function calls
   o Pipeline service helper function which calls
     o Azdo pipeline API via web client
```

The proposal is to have a way to maintain this exception chain; and preserving
the statusCode. Taking the above example and presuming that authentication
failed in web client call. We would like to have a JSON object like this

```
{
  "statusCode": 101,
  "message": "Execution of spk project install-lifecycle-pipeline could not be completed.",
  "error": {
    "message": "Execute of installPipeline function failed."
    "error": {
      "statusCode": 401,
      "message": "Unauthorized access to pipeline...."
    }
  }
}
```

And this JSON shall be `stringified` and logged as `error` in the finally output
of the log.

The typescript interface of this ErrorChain is

```
interface ErrorChain {
  statusCode?: number;
  message: string;
  error?: ErrorChain;
}
```

### 3.3 List of error codes

To be completed

| Error Code | Description                       |
| ---------: | --------------------------------- |
|        101 | Execution of command failed       |
|        110 | Validation of input values failed |
|        201 | Azure pipeline API call failed    |
|        ... | ...                               |

## 4. Dependencies

We do not have additional dependencies. The only dependency is `winston log`.

## 5. Known issues

None

## 6. Risks & Mitigations

We have to be careful so we do not expose secrets/passwords in logs.

## 7. Documentations

A formal document to be created and posted under
https://github.com/CatalystCode/spk/tree/master/guides
