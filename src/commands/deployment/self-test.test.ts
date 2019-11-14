import * as update from "../../lib/azure/deploymenttable";
import { logger } from "../../logger";
import { deleteSelfTestData, writeSelfTestData } from "./self-test";

let mockedDB: any[] = [];
const mockTableInfo: update.IDeploymentTable = {
  accountKey: "test",
  accountName: "test",
  partitionKey: "test",
  tableName: "test"
};

jest.spyOn(update, "findMatchingDeployments").mockImplementation(
  (
    tableInfo: update.IDeploymentTable,
    filterName: string,
    filterValue: string
  ): Promise<any> => {
    const array: any[] = [];
    return new Promise(resolve => {
      mockedDB.forEach((row: any) => {
        if (row.p1 === "500") {
          logger.debug(
            `Found matching mock entry ${JSON.stringify(row, null, 4)}`
          );
          array.push(row);
        }
      });
      resolve(array);
    });
  }
);

jest.spyOn(update, "insertToTable").mockImplementation(
  (tableInfo: update.IDeploymentTable, entry: any): Promise<any> => {
    return new Promise(resolve => {
      logger.debug(`Inserting to table ${JSON.stringify(entry, null, 4)}`);
      mockedDB.push(entry);
      resolve(entry);
    });
  }
);

jest.spyOn(update, "deleteFromTable").mockImplementation(
  (tableInfo: update.IDeploymentTable, entry: any): Promise<any> => {
    return new Promise(resolve => {
      logger.debug(`Delete from table ${JSON.stringify(entry, null, 4)}`);
      if (mockedDB.length === 1 && mockedDB[0].p1 === "500") {
        mockedDB = [];
      }
      resolve(0);
    });
  }
);

jest.spyOn(update, "updateEntryInTable").mockImplementation(
  (tableInfo: update.IDeploymentTable, entry: any): Promise<any> => {
    logger.debug(`Updating existing entry ${JSON.stringify(entry, null, 4)}`);
    return new Promise(resolve => {
      mockedDB.forEach((row: any, index: number) => {
        if (row.RowKey === entry.RowKey) {
          mockedDB[index] = entry;
          resolve(entry);
        }
      }, mockedDB);
    });
  }
);

jest.spyOn(Math, "random").mockImplementation((): number => {
  return 0.5;
});

describe("Write self-test data", () => {
  it("should create a row key, add to storage", async () => {
    mockedDB = [];
    await writeSelfTestData(
      "test-key",
      "test-name",
      "test-partition-key",
      "test-table-name"
    );
    expect(mockedDB).toHaveLength(1);
    expect(mockedDB[0].p1).toBe("500");
    expect(mockedDB[0].service).toBe("spk-self-test");
  });
});

describe("Delete self-test data", () => {
  it("should create a row key, add to storage and delete it", async () => {
    mockedDB = [];
    await writeSelfTestData(
      "test-key",
      "test-name",
      "test-partition-key",
      "test-table-name"
    );
    expect(mockedDB).toHaveLength(1);
    expect(mockedDB[0].p1).toBe("500");
    expect(mockedDB[0].service).toBe("spk-self-test");

    await deleteSelfTestData(
      "test-key",
      "test-name",
      "test-partition-key",
      "test-table-name",
      "500"
    );
    expect(mockedDB).toHaveLength(0);
  });
});
