import { describe, expect, it } from "bun:test";
import { testDb } from "./integration-setup";

describe("testDb", () => {
  it("should be defined", () => {
    // testDb is now a function that returns the db instance
    const db = testDb();
    console.log("testDb is a function:", typeof testDb === "function");
    console.log("testDb() result:", db);
    expect(db).toBeDefined();
  });

  it("should have the expected methods", () => {
    const db = testDb();
    expect(typeof db.execute).toBe("function");
    expect(typeof db.select).toBe("function");
  });
});
