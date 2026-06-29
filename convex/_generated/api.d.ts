/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminUsers from "../adminUsers.js";
import type * as adminUsersActions from "../adminUsersActions.js";
import type * as auth from "../auth.js";
import type * as emailLogs from "../emailLogs.js";
import type * as escorts from "../escorts.js";
import type * as events from "../events.js";
import type * as guests from "../guests.js";
import type * as http from "../http.js";
import type * as orgSettings from "../orgSettings.js";
import type * as profiles from "../profiles.js";
import type * as search from "../search.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminUsers: typeof adminUsers;
  adminUsersActions: typeof adminUsersActions;
  auth: typeof auth;
  emailLogs: typeof emailLogs;
  escorts: typeof escorts;
  events: typeof events;
  guests: typeof guests;
  http: typeof http;
  orgSettings: typeof orgSettings;
  profiles: typeof profiles;
  search: typeof search;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
