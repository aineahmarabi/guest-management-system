import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
