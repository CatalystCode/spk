import * as azure from "azure-storage";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import * as update from "./updatetable";

const mockedDB: any[] = [];
jest
  .spyOn(update, "insertToTable")
  .mockImplementation(
    (
      accountName: string,
      accountKey: string,
      tableName: string,
      entry: any,
      callback: (
        error: Error,
        result: any,
        response: azure.ServiceResponse
      ) => void
    ) => {
      logger.debug(`Inserting to table ${JSON.stringify(entry, null, 4)}`);
      mockedDB.push(entry);
    }
  );
jest
  .spyOn(update, "updateEntryInTable")
  .mockImplementation(
    (
      accountName: string,
      accountKey: string,
      tableName: string,
      entry: any,
      callback: (
        error: Error,
        result: any,
        response: azure.ServiceResponse
      ) => void
    ) => {
      logger.debug(`Updating existing entry ${JSON.stringify(entry, null, 4)}`);
      mockedDB.forEach((row: any, index: number) => {
        if (row.RowKey === entry.RowKey) {
          mockedDB[index] = entry;
        }
      }, mockedDB);
    }
  );

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("Verify the update deployment commands", () => {
  it("should create a row key, add to storage and update the deployment", async () => {
    // Verify that RowKey is valid
    const rowKey = update.getRowKey();
    expect(rowKey).toHaveLength(12);
    expect(/^[a-z0-9]+$/i.test(rowKey)).toBeTruthy();
    logger.info(
      `Verified that RowKey ${rowKey} is alphanumeric with 12 characters`
    );

    // Verify that adding a deployment works
    expect(mockedDB).toHaveLength(0);
    update.addDeployment(
      "test",
      "test",
      "test",
      "test",
      "p1",
      "1234",
      "imageTag",
      "hello-spk-master-1234",
      "service",
      "test",
      "commitId",
      "bbbbbbb"
    );
    expect(mockedDB).toHaveLength(1);
    logger.info(`Verified that a new deployment was added`);

    // Verify that updating an existing deployment does not add a new element
    update.updateExistingDeployment(
      mockedDB,
      "test",
      "test",
      "test",
      "test",
      "imageTag",
      "hello-spk-master-1234",
      "p2",
      "567",
      "env",
      "Dev"
    );
    expect(mockedDB).toHaveLength(1);
    expect(mockedDB[0].p2).toBe("567");
    expect(mockedDB[0].env).toBe("dev");
    expect(mockedDB[0].p1).toBe("1234");
    logger.info(`Verified that a deployment was updated`);

    // Verify that updating an existing deployment that has no match, does add a new element
    update.updateExistingDeployment(
      mockedDB,
      "test",
      "test",
      "test",
      "test",
      "imageTag",
      "hello-spk-master-1234",
      "p2",
      "568",
      "env",
      "Dev",
      "hldCommitId",
      "aaaaaaaa"
    );
    expect(mockedDB).toHaveLength(2);
    expect(mockedDB[1].p1).toBe("1234");
    expect(mockedDB[1].p2).toBe("568");
    logger.info(
      `Verified that updating a deployment that does not match adds a new element`
    );

    // Verify third key can be added
    update.updateExistingDeployment(
      mockedDB,
      "test",
      "test",
      "test",
      "test",
      "p2",
      "568",
      "p3",
      "900"
    );
    expect(mockedDB).toHaveLength(2);
    expect(mockedDB[1].p3).toBe("900");
  });
});
