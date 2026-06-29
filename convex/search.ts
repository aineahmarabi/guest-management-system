import { v } from "convex/values";
import { query } from "./_generated/server";

export const global = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    if (!q || q.trim().length < 2) return { guests: [], events: [] };
    const term = q.trim();

    const [guestsByName, events] = await Promise.all([
      ctx.db
        .query("guests")
        .withSearchIndex("search_guests", s => s.search("full_name", term))
        .take(8),
      ctx.db
        .query("events")
        .withSearchIndex("search_events", s => s.search("name", term))
        .take(5),
    ]);

    return { guests: guestsByName, events };
  },
});
