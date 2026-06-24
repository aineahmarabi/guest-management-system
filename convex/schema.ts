import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.id("users"),
    full_name: v.string(),
    email: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("event_manager")),
    is_active: v.boolean(),
    created_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),

  events: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    venue: v.string(),
    event_date: v.string(),
    event_time: v.string(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("completed")),
    created_by: v.optional(v.id("profiles")),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_date", ["event_date"])
    .index("by_status", ["status"])
    .index("by_created_at", ["created_at"]),

  guests: defineTable({
    event_id: v.id("events"),
    full_name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    ticket_id: v.string(),
    escort_count: v.number(),
    checked_in: v.boolean(),
    checked_in_at: v.optional(v.string()),
    pdf_generated: v.boolean(),
    email_sent: v.boolean(),
    created_by: v.optional(v.id("profiles")),
    created_at: v.string(),
  })
    .index("by_event_id", ["event_id"])
    .index("by_ticket_id", ["ticket_id"])
    .index("by_email", ["email"])
    .index("by_created_at", ["created_at"]),

  escorts: defineTable({
    guest_id: v.id("guests"),
    full_name: v.string(),
    id_number: v.optional(v.string()),
    created_at: v.string(),
  }).index("by_guest_id", ["guest_id"]),

  email_logs: defineTable({
    event_id: v.optional(v.id("events")),
    guest_id: v.optional(v.id("guests")),
    sent_at: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error_message: v.optional(v.string()),
  })
    .index("by_event_id", ["event_id"])
    .index("by_guest_id", ["guest_id"]),

  org_settings: defineTable({
    company_name: v.string(),
    website: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.string(),
    updated_at: v.string(),
  }),
});
