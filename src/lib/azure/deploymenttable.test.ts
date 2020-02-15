import uuid from "uuid";
import { disableVerboseLogging, enableVerboseLogging } from "../../logger";
import * as deploymenttable from "./deploymenttable";
import {
  addSrcToACRPipeline,
  getTableService,
  IDeploymentTable,
  IEntryACRToHLDPipeline,
  updateMatchingArcToHLDPipelineEntry
} from "./deploymenttable";

const mockedTableInfo: IDeploymentTable = {
  accountKey: Buffer.from(uuid()).toString("base64"),
  accountName: uuid(),
  partitionKey: uuid(),
  tableName: uuid()
};
const mockedPipelineId = uuid();
const mockedImageTag = uuid();
const mockedServiceName = uuid();
const mockedCommitId = uuid();
const mockedHldCommitId = uuid();
const mockedEnv = uuid();
const mockedPr = uuid();

beforeAll(() => {
  enableVerboseLogging();
});

afterAll(() => {
  disableVerboseLogging();
});

describe("test getTableService function", () => {
  it("sanity test", () => {
    const result = getTableService(mockedTableInfo);
    expect(result).toBeDefined();
  });
});

describe("test addSrcToACRPipeline function", () => {
  it("positive test", async done => {
    jest
      .spyOn(deploymenttable, "insertToTable")
      .mockReturnValueOnce(Promise.resolve());
    const entry = await addSrcToACRPipeline(
      mockedTableInfo,
      mockedPipelineId,
      mockedImageTag,
      mockedServiceName,
      mockedCommitId
    );
    expect(entry.commitId).toBe(mockedCommitId);
    expect(entry.p1).toBe(mockedPipelineId);
    expect(entry.service).toBe(mockedServiceName);
    expect(entry.imageTag).toBe(mockedImageTag);
    done();
  });
  it("negative test", async done => {
    jest
      .spyOn(deploymenttable, "insertToTable")
      .mockReturnValueOnce(Promise.reject(new Error("Error")));
    await expect(
      addSrcToACRPipeline(
        mockedTableInfo,
        mockedPipelineId,
        mockedImageTag,
        mockedServiceName,
        mockedCommitId
      )
    ).rejects.toThrow();
    done();
  });
});

describe("test updateMatchingArcToHLDPipelineEntry function", () => {
  it("positive test: matching entry", async done => {
    jest
      .spyOn(deploymenttable, "updateEntryInTable")
      .mockReturnValueOnce(Promise.resolve());
    const entries: IEntryACRToHLDPipeline[] = [
      {
        PartitionKey: uuid(),
        RowKey: uuid(),
        commitId: mockedCommitId,
        env: {
          _: mockedEnv
        },
        hldCommitId: {
          _: mockedHldCommitId
        },
        imageTag: mockedImageTag,
        p1: mockedPipelineId,
        p2: {
          _: mockedPipelineId
        },
        service: mockedServiceName
      }
    ];
    const result = await updateMatchingArcToHLDPipelineEntry(
      entries,
      mockedTableInfo,
      mockedPipelineId,
      mockedImageTag,
      mockedHldCommitId,
      mockedEnv,
      mockedPr
    );
    expect(result).toBeDefined();
    done();
  });
  it("positive test: no matching entries", async done => {
    jest
      .spyOn(deploymenttable, "updateEntryInTable")
      .mockReturnValueOnce(Promise.resolve());
    const result = await updateMatchingArcToHLDPipelineEntry(
      [],
      mockedTableInfo,
      mockedPipelineId,
      mockedImageTag,
      mockedHldCommitId,
      mockedEnv,
      mockedPr
    );
    expect(result).toBeNull();
    done();
  });
});
