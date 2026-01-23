/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as blockingLabels from "../blockingLabels.js";
import type * as budget from "../budget.js";
import type * as categories from "../categories.js";
import type * as coreAppUpdates from "../coreAppUpdates.js";
import type * as coreApps from "../coreApps.js";
import type * as dashboard from "../dashboard.js";
import type * as departments from "../departments.js";
import type * as github from "../github.js";
import type * as githubActions from "../githubActions.js";
import type * as http from "../http.js";
import type * as keydevs from "../keydevs.js";
import type * as months from "../months.js";
import type * as notes from "../notes.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  blockingLabels: typeof blockingLabels;
  budget: typeof budget;
  categories: typeof categories;
  coreAppUpdates: typeof coreAppUpdates;
  coreApps: typeof coreApps;
  dashboard: typeof dashboard;
  departments: typeof departments;
  github: typeof github;
  githubActions: typeof githubActions;
  http: typeof http;
  keydevs: typeof keydevs;
  months: typeof months;
  notes: typeof notes;
  seed: typeof seed;
  users: typeof users;
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
