"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { createAccount, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Public action — called from Next.js API routes via fetchAction
export const createUser = action({
  args: {
    full_name: v.string(),
    email: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("event_manager")),
    password: v.string(),
  },
  handler: async (ctx, { full_name, email, role, password }) => {
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: password },
      profile: { email, name: full_name },
    });
    const profileId: string = await ctx.runMutation(internal.adminUsers.upsertProfile, {
      userId: user._id,
      full_name,
      email,
      role,
    });
    return profileId;
  },
});

// Public action — called from Next.js API routes
export const resetUserPassword = action({
  args: { profileId: v.id("profiles"), newPassword: v.string() },
  handler: async (ctx, { profileId, newPassword }) => {
    const profile = await ctx.runQuery(internal.adminUsers.getProfileForAction, { profileId });
    if (!profile) throw new Error("Profile not found");
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: profile.email, secret: newPassword },
    });
  },
});

// Convenience action — reset any account's password by email, callable via `npx convex run`
export const resetPasswordByEmail = action({
  args: { email: v.string(), newPassword: v.string() },
  handler: async (ctx, { email, newPassword }) => {
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: newPassword },
    });
  },
});

// Public action — called from Next.js /api/profile/change-password
export const changePassword = action({
  args: { profileId: v.id("profiles"), currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, { profileId, currentPassword, newPassword }) => {
    const profile = await ctx.runQuery(internal.adminUsers.getProfileForAction, { profileId });
    if (!profile) throw new Error("Profile not found");
    // retrieveAccount throws if secret doesn't match — this verifies the current password
    await retrieveAccount(ctx, {
      provider: "password",
      account: { id: profile.email, secret: currentPassword },
    });
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: profile.email, secret: newPassword },
    });
  },
});
