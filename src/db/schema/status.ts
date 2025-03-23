import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { json } from "drizzle-orm/pg-core";
import { issuerProfiles } from "./index";

// Status lists for credential revocation
export const statusLists = pgTable("status_lists", {
  statusListId: uuid("status_list_id").primaryKey().defaultRandom(),
  issuerId: uuid("issuer_id")
    .references(() => issuerProfiles.issuerId)
    .notNull(),
  statusListJson: json("status_list_json").notNull(), // Full Status List 2021 credential in JSON format
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Status list indices for mapping assertion IDs to indices
export const statusListIndices = pgTable("status_list_indices", {
  mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
  assertionId: uuid("assertion_id").notNull(),
  statusListId: uuid("status_list_id")
    .references(() => statusLists.statusListId)
    .notNull(),
  statusIndex: uuid("status_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export types for use in services
export type NewStatusList = typeof statusLists.$inferInsert;
export type NewStatusListIndex = typeof statusListIndices.$inferInsert;
