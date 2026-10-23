import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_MESSAGE = "The website is currently under maintenance. Please wait for service to resume.";

export const getStatus = query({
  args: {},
  returns: v.object({ enabled: v.boolean(), message: v.string() }),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "maintenance"))
      .unique();

    return {
      enabled: settings?.enabled ?? false,
      message: settings?.message ?? DEFAULT_MESSAGE,
    };
  },
});

export const getAdminStatus = query({
  args: {},
  returns: v.object({
    isAdmin: v.boolean(),
    adminConfigured: v.boolean(),
    userId: v.union(v.id("users"), v.null()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const configuredUserId = process.env.OSINCT_ADMIN_USER_ID;
    return {
      isAdmin: Boolean(userId && configuredUserId && userId === configuredUserId),
      adminConfigured: Boolean(configuredUserId),
      userId,
    };
  },
});

export const updateStatus = mutation({
  args: { enabled: v.boolean(), message: v.string() },
  returns: v.object({ enabled: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const configuredUserId = process.env.OSINCT_ADMIN_USER_ID;
    if (!userId || !configuredUserId || userId !== configuredUserId) {
      throw new ConvexError("This account is not authorized to change maintenance settings.");
    }

    const message = args.message.trim();
    if (message.length < 5 || message.length > 500) {
      throw new ConvexError("The maintenance message must be between 5 and 500 characters.");
    }

    const current = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "maintenance"))
      .unique();

    if (current) {
      await ctx.db.patch(current._id, { enabled: args.enabled, message });
    } else {
      await ctx.db.insert("appSettings", { key: "maintenance", enabled: args.enabled, message });
    }

    return { enabled: args.enabled, message };
  },
});

// The public UI may submit the maintenance code, but the code itself is checked
// only on the server. Configure OSINCT_MAINTENANCE_CODE in Convex environment.
export const enableByCode = mutation({
  args: { code: v.string() },
  returns: v.object({ enabled: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const configuredCode = process.env.OSINCT_MAINTENANCE_CODE;
    if (!configuredCode || args.code !== configuredCode) {
      throw new ConvexError("Invalid maintenance code.");
    }

    const message = DEFAULT_MESSAGE;
    const current = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "maintenance"))
      .unique();

    if (current) {
      await ctx.db.patch(current._id, { enabled: true, message });
    } else {
      await ctx.db.insert("appSettings", { key: "maintenance", enabled: true, message });
    }

    return { enabled: true, message };
  },
});
