import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

export const listByGuestId = query({
  args: { guest_id: v.id("guests") },
  handler: async (ctx, { guest_id }) => {
    return ctx.db
      .query("escorts")
      .withIndex("by_guest_id", q => q.eq("guest_id", guest_id))
      .collect();
  },
});

export const deleteExcess = mutation({
  args: { guest_id: v.id("guests"), keep_count: v.number() },
  handler: async (ctx, { guest_id, keep_count }) => {
    const escorts = await ctx.db
      .query("escorts")
      .withIndex("by_guest_id", q => q.eq("guest_id", guest_id))
      .collect();
    const toDelete = escorts.slice(keep_count);
    for (const e of toDelete) await ctx.db.delete(e._id);
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
