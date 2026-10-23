import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  appSettings: defineTable({
    key: v.literal("maintenance"),
    enabled: v.boolean(),
    message: v.string(),
  }).index("by_key", ["key"]),
});
