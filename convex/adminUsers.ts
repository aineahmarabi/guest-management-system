import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

// Debug: check stored auth account secret format
export const debugAuthAccount = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .filter(q => q.eq(q.field("providerAccountId"), email))
      .collect();
    return accounts.map(a => ({ provider: a.provider, providerAccountId: a.providerAccountId, secretPrefix: a.secret?.slice(0, 20) ?? null }));
  },
});

// Seed-only helper: deletes all records for a given email so we can re-seed cleanly
export const deleteUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .filter(q => q.eq(q.field("providerAccountId"), email))
      .collect();
    for (const acc of accounts) {
      await ctx.db.delete(acc._id);
    }
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_email", q => q.eq("email", email))
      .collect();
    for (const p of profiles) {
      await ctx.db.delete(p._id);
    }
    const users = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), email))
      .collect();
    for (const u of users) {
      await ctx.db.delete(u._id);
    }
    return "done";
  },
});

// Seed-only: set a profile's role by email
export const setRoleByEmail = mutation({
  args: { email: v.string(), role: v.union(v.literal("super_admin"), v.literal("event_manager")) },
  handler: async (ctx, { email, role }) => {
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_email", q => q.eq("email", email))
      .collect();
    for (const p of profiles) {
      await ctx.db.patch(p._id, { role });
    }
    return profiles.length;
  },
});

// Called internally by adminUsersActions (bcrypt actions)
export const insertUserWithPassword = internalMutation({
  args: {
    email: v.string(),
    full_name: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("event_manager")),
    passwordHash: v.string(),
  },
  handler: async (ctx, { email, full_name, role, passwordHash }) => {
    const existing = await ctx.db
      .query("authAccounts")
      .filter(q => q.eq(q.field("providerAccountId"), email))
      .first();
    if (existing) throw new Error("A user with this email already exists.");

    const userId = await ctx.db.insert("users", { email, name: full_name });

    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: email,
      secret: passwordHash,
    });

    const profileId = await ctx.db.insert("profiles", {
      userId,
      full_name,
      email,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    return profileId as string;
  },
});

// Called internally by adminUsersActions
export const updatePasswordHash = internalMutation({
  args: { profileId: v.id("profiles"), hash: v.string() },
  handler: async (ctx, { profileId, hash }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) throw new Error("Profile not found");
    const account = await ctx.db
      .query("authAccounts")
      .filter(q =>
        q.and(q.eq(q.field("userId"), profile.userId), q.eq(q.field("provider"), "password"))
      )
      .first();
    if (!account) throw new Error("Auth account not found");
    await ctx.db.patch(account._id, { secret: hash });
  },
});

// Called internally by adminUsersActions
export const getPasswordHash = internalQuery({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) return null;
    const account = await ctx.db
      .query("authAccounts")
      .filter(q =>
        q.and(q.eq(q.field("userId"), profile.userId), q.eq(q.field("provider"), "password"))
      )
      .first();
    return account?.secret ?? null;
  },
});

// Public — called from Next.js API routes
export const deactivateUser = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    await ctx.db.patch(profileId, { is_active: false });
    return null;
  },
});

export const listAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("profiles").order("asc").collect();
  },
});

export const getProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db.query("profiles").withIndex("by_userId", q => q.eq("userId", userId)).first();
  },
});

export const getProfileById = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => ctx.db.get(profileId),
});

export const updateProfileName = mutation({
  args: { profileId: v.id("profiles"), full_name: v.string() },
  handler: async (ctx, { profileId, full_name }) => {
    await ctx.db.patch(profileId, { full_name });
  },
});

// Used by createUser action — upserts profile after @convex-dev/auth creates the user/account
export const upsertProfile = internalMutation({
  args: { userId: v.id("users"), full_name: v.string(), email: v.string(), role: v.union(v.literal("super_admin"), v.literal("event_manager")) },
  handler: async (ctx, { userId, full_name, email, role }) => {
    const existing = await ctx.db.query("profiles").withIndex("by_userId", q => q.eq("userId", userId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { full_name, email, role, is_active: true });
      return existing._id as string;
    }
    return (await ctx.db.insert("profiles", { userId, full_name, email, role, is_active: true, created_at: new Date().toISOString() })) as string;
  },
});

// Used by resetUserPassword action
export const getProfileForAction = internalQuery({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => ctx.db.get(profileId),
});

// Looks up the auth account secret for a given email (used by changePassword action)
export const getAuthAccountSecret = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", q => q.eq("provider", "password").eq("providerAccountId", email))
      .unique();
    return account ? { id: account._id, secret: account.secret ?? null } : null;
  },
});

// Updates auth account secret directly (hash computed in action, not here)
export const updateAuthAccountSecret = internalMutation({
  args: { accountId: v.id("authAccounts"), secret: v.string() },
  handler: async (ctx, { accountId, secret }) => {
    await ctx.db.patch(accountId, { secret });
  },
});
