import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const countFailedByEvent = query({
  args: { event_id: v.id("events") },
  handler: async (ctx, { event_id }) => {
    const logs = await ctx.db
      .query("email_logs")
      .withIndex("by_event_id", q => q.eq("event_id", event_id))
      .collect();
    return logs.filter(l => l.status === "failed").length;
  },
});

export const countsByEvents = query({
  args: { eventIds: v.array(v.id("events")) },
  handler: async (ctx, { eventIds }) => {
    const result: Record<string, { sent: number; failed: number }> = {};
    for (const eid of eventIds) {
      const logs = await ctx.db
        .query("email_logs")
        .withIndex("by_event_id", q => q.eq("event_id", eid))
        .collect();
      result[eid] = {
        sent: logs.filter(l => l.status === "sent").length,
        failed: logs.filter(l => l.status === "failed").length,
      };
    }
    return result;
  },
});

export const insert = mutation({
  args: {
    event_id: v.optional(v.id("events")),
    guest_id: v.optional(v.id("guests")),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error_message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("email_logs", {
      ...args,
      sent_at: new Date().toISOString(),
    });
  },
});
