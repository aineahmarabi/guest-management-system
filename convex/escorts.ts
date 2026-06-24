import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
  args: {
    guest_id: v.id("guests"),
    full_name: v.string(),
    id_number: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("escorts", { ...args, created_at: new Date().toISOString() });
  },
});

export const createMany = mutation({
  args: {
    escorts: v.array(v.object({
      guest_id: v.id("guests"),
      full_name: v.string(),
      id_number: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { escorts }) => {
    const now = new Date().toISOString();
    for (const e of escorts) {
      await ctx.db.insert("escorts", { ...e, created_at: now });
    }
  },
});
