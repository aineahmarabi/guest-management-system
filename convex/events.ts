import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { status, search }) => {
    let events = await ctx.db.query("events").order("desc").collect();
    if (status && status !== "all") {
      events = events.filter(e => e.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      events = events.filter(e => e.name.toLowerCase().includes(q));
    }
    return events;
  },
});

export const getById = query({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const upcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    const today = new Date().toISOString().split("T")[0];
    const all = await ctx.db
      .query("events")
      .withIndex("by_date", q => q.gte("event_date", today))
      .order("asc")
      .collect();
    return all.slice(0, limit);
  },
});

export const listInRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    status: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, { startDate, endDate, status, eventId }) => {
    let events = await ctx.db
      .query("events")
      .withIndex("by_date", q => q.gte("event_date", startDate).lte("event_date", endDate))
      .order("desc")
      .collect();
    if (status && status !== "all") events = events.filter(e => e.status === status);
    if (eventId) events = events.filter(e => e._id === eventId);
    return events;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    venue: v.string(),
    event_date: v.string(),
    event_time: v.string(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("completed")),
    created_by: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return ctx.db.insert("events", {
      ...args,
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    venue: v.string(),
    event_date: v.string(),
    event_time: v.string(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("completed")),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    await ctx.db.patch(id, { ...fields, updated_at: new Date().toISOString() });
  },
});
