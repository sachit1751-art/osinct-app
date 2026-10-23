import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";

const recordValidator = v.object({
  id: v.string(),
  title: v.string(),
  category: v.string(),
  status: v.string(),
  updatedAt: v.string(),
  description: v.string(),
  owner: v.string(),
  region: v.string(),
});

const demoRecords = [
  { id: "DEMO-2048", title: "Northstar relay", category: "Infrastructure", status: "Verified", updatedAt: "2026-10-20", description: "Sample relay record in the northern service zone. This entry contains fictional operational data.", owner: "Operations demo team", region: "North zone", phoneSearchKey: "2025550101", identitySearchKey: "DEMO-ID-0001" },
  { id: "DEMO-7316", title: "Cedar gateway", category: "Network equipment", status: "In review", updatedAt: "2026-10-18", description: "Sample gateway record awaiting a routine configuration review.", owner: "Network demo team", region: "West zone", phoneSearchKey: "2025550102", identitySearchKey: "DEMO-ID-0002" },
  { id: "DEMO-0912", title: "Harbor sensor", category: "Monitoring", status: "Verified", updatedAt: "2026-10-15", description: "Sample environmental sensor with a fictional inspection record.", owner: "Field demo team", region: "Coastal zone", phoneSearchKey: "2025550103", identitySearchKey: "DEMO-ID-0003" },
];

export const searchRecords = query({
  args: { mode: v.union(v.literal("phone"), v.literal("identity")), query: v.string() },
  returns: v.array(recordValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in before searching.");

    const settings = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "maintenance"))
      .unique();
    if (settings?.enabled) {
      throw new ConvexError(`MAINTENANCE: ${settings.message}`);
    }

    const input = args.query.trim();
    if (!input || input.length > 80) throw new ConvexError("Enter a search value of 1–80 characters.");
    if (args.mode === "phone") {
      const digits = input.replace(/\D/g, "");
      if (!/^[+\d().\s-]+$/.test(input) || digits.length < 7 || digits.length > 15) {
        throw new ConvexError("Enter a phone number using 7–15 digits.");
      }
    } else if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$/.test(input)) {
      throw new ConvexError("Use a demo reference with 3–80 letters, numbers, hyphens, or underscores.");
    }

    const normalized = args.mode === "phone" ? input.replace(/\D/g, "") : input.toLowerCase();
    return demoRecords
      .filter((record) => {
        const key = args.mode === "phone" ? record.phoneSearchKey : record.identitySearchKey.toLowerCase();
        return key.includes(normalized) || record.id.toLowerCase() === normalized;
      })
      .map(({ phoneSearchKey: _phone, identitySearchKey: _identity, ...record }) => record);
  },
});
