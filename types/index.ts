import { Doc, Id } from "@/convex/_generated/dataModel";

export type Profile = Doc<"profiles">;
export type Event = Doc<"events">;
export type Guest = Doc<"guests">;
export type Escort = Doc<"escorts">;
export type EmailLog = Doc<"email_logs">;
export type OrgSettings = Doc<"org_settings">;

export type { Id };
