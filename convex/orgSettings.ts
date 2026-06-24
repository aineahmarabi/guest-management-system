import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("org_settings").collect();
    return all[0] ?? null;
  },
});

export const upsert = mutation({
  args: {
    company_name: v.string(),
    website: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("org_settings").first();
    const updated_at = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updated_at });
    } else {
      await ctx.db.insert("org_settings", { ...args, updated_at });
    }
    return null;
  },
});
