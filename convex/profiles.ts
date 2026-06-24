import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
  },
});

export const getById = internalQuery({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getByUserIdInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
  },
});

export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("profiles").order("asc").collect();
  },
});

export const updateName = mutation({
  args: { full_name: v.string() },
  handler: async (ctx, { full_name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, { full_name: full_name.trim() });
  },
});

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    full_name: v.string(),
    email: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("event_manager")),
  },
  handler: async (ctx, { userId, full_name, email, role }) => {
    return ctx.db.insert("profiles", {
      userId,
      full_name,
      email,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    });
  },
});

export const deactivateInternal = internalMutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    await ctx.db.patch(profileId, { is_active: false });
  },
});

export const updatePasswordHashInternal = internalMutation({
  args: { userId: v.id("users"), newHash: v.string() },
  handler: async (ctx, { userId, newHash }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", q =>
        q.eq("userId", userId).eq("provider", "password")
      )
      .unique();
    if (!account) throw new Error("Auth account not found");
    await ctx.db.patch(account._id, { secret: newHash });
  },
});
