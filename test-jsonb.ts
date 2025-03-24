import { jsonb } from "drizzle-orm/pg-core";

console.log(
  "JSONB type import test:",
  typeof jsonb === "function" ? "SUCCESS" : "FAILED",
);
