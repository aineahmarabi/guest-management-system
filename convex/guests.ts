import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const listByEvent = query({
  args: { event_id: v.id("events") },
  handler: async (ctx, { event_id }) => {
    return ctx.db
      .query("guests")
      .withIndex("by_event_id", q => q.eq("event_id", event_id))
      .order("asc")
      .collect();
  },
});

export const listByEventUnsent = query({
  args: { event_id: v.id("events") },
  handler: async (ctx, { event_id }) => {
    const all = await ctx.db
      .query("guests")
      .withIndex("by_event_id", q => q.eq("event_id", event_id))
      .collect();
    return all.filter(g => !g.email_sent);
  },
});

export const getById = query({
  args: { id: v.id("guests") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getByTicketId = query({
  args: { ticket_id: v.string(), event_id: v.optional(v.id("events")) },
  handler: async (ctx, { ticket_id, event_id }) => {
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_ticket_id", q => q.eq("ticket_id", ticket_id))
      .collect();
    if (event_id) return guests.find(g => g.event_id === event_id) ?? null;
    return guests[0] ?? null;
  },
});

export const recentAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    return ctx.db
      .query("guests")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});

export const countByEvent = query({
  args: { event_id: v.id("events") },
  handler: async (ctx, { event_id }) => {
    const all = await ctx.db
      .query("guests")
      .withIndex("by_event_id", q => q.eq("event_id", event_id))
      .collect();
    return {
      total: all.length,
      checked_in: all.filter(g => g.checked_in).length,
      email_sent: all.filter(g => g.email_sent).length,
    };
  },
});

export const countsAll = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("guests").collect();
    return {
      total: all.length,
      checked_in: all.filter(g => g.checked_in).length,
    };
  },
});

export const countsByEvent = query({
  args: { eventIds: v.array(v.id("events")) },
  handler: async (ctx, { eventIds }) => {
    const result: Record<string, number> = {};
    for (const eid of eventIds) {
      const all = await ctx.db
        .query("guests")
        .withIndex("by_event_id", q => q.eq("event_id", eid))
        .collect();
      result[eid] = all.length;
    }
    return result;
  },
});

export const checkedInToday = query({
  args: { since: v.string() },
  handler: async (ctx, { since }) => {
    const all = await ctx.db.query("guests").collect();
    return all.filter(g => g.checked_in && g.checked_in_at && g.checked_in_at >= since).length;
  },
});

export const listByEventForReport = query({
  args: { event_id: v.id("events") },
  handler: async (ctx, { event_id }) => {
    return ctx.db
      .query("guests")
      .withIndex("by_event_id", q => q.eq("event_id", event_id))
      .collect();
  },
});

export const create = mutation({
  args: {
    event_id: v.id("events"),
    full_name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    ticket_id: v.string(),
    escort_count: v.number(),
    created_by: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("guests", {
      ...args,
      checked_in: false,
      pdf_generated: false,
      email_sent: false,
      created_at: new Date().toISOString(),
    });
  },
});

export const checkIn = mutation({
  args: { id: v.id("guests") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    await ctx.db.patch(id, {
      checked_in: true,
      checked_in_at: new Date().toISOString(),
    });
  },
});

export const markEmailSent = mutation({
  args: { id: v.id("guests") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { email_sent: true, pdf_generated: true });
  },
});

export const markPdfGenerated = mutation({
  args: { id: v.id("guests") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { pdf_generated: true });
  },
});

export const remove = mutation({
  args: { id: v.id("guests") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const escorts = await ctx.db
      .query("escorts")
      .withIndex("by_guest_id", q => q.eq("guest_id", id))
      .collect();
    for (const e of escorts) await ctx.db.delete(e._id);
    await ctx.db.delete(id);
  },
});
