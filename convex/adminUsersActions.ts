import { v } from "convex/values";
import { action } from "./_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";

// Public action — called from Next.js API routes via fetchAction
// Uses @convex-dev/auth's createAccount so hashing goes through auth:store mutation
// (same path as signIn verification → guaranteed hash compatibility)
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
    const account = await ctx.runQuery(internal.adminUsers.getAuthAccountSecret, { email: profile.email });
    if (!account) throw new Error("Auth account not found");
    const hash = await new Scrypt().hash(newPassword);
    await ctx.runMutation(internal.adminUsers.updateAuthAccountSecret, { accountId: account.id, secret: hash });
  },
});

// Public action — called from Next.js /api/profile/change-password
export const changePassword = action({
  args: { profileId: v.id("profiles"), currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, { profileId, currentPassword, newPassword }) => {
    const profile = await ctx.runQuery(internal.adminUsers.getProfileForAction, { profileId });
    if (!profile) throw new Error("Profile not found");
    const account = await ctx.runQuery(internal.adminUsers.getAuthAccountSecret, { email: profile.email });
    if (!account?.secret) throw new Error("Account not found");
    const valid = await new Scrypt().verify(account.secret, currentPassword);
    if (!valid) throw new Error("Current password is incorrect");
    const newHash = await new Scrypt().hash(newPassword);
    await ctx.runMutation(internal.adminUsers.updateAuthAccountSecret, { accountId: account.id, secret: newHash });
  },
});
