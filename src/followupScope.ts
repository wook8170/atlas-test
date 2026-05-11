export type FollowupFeature =
  | "guardian-management"
  | "homework-checklist"
  | "cross-device-sync"
  | "server-backed-notifications";

export type OutOfScopeFeature =
  | "external-calendar-integrations"
  | "social-sharing-and-community"
  | "billing-and-subscriptions"
  | "teacher-and-classroom-operations"
  | "admin-operations-console";

export const followupScope = {
  source: "AGENTORC-5",
  phase: "post-mvp",
  included: [
    "guardian-management",
    "homework-checklist",
    "cross-device-sync",
    "server-backed-notifications",
  ] as const satisfies readonly FollowupFeature[],
  excluded: [
    "external-calendar-integrations",
    "social-sharing-and-community",
    "billing-and-subscriptions",
    "teacher-and-classroom-operations",
    "admin-operations-console",
  ] as const satisfies readonly OutOfScopeFeature[],
  recommendedDeliveryOrder: [
    "accounts-and-permissions-backbone",
    "homework-checklist",
    "sync-core",
    "server-backed-notifications",
    "guardian-read-dashboard",
  ] as const,
} as const;

export function isApprovedFollowupFeature(
  feature: string,
): feature is FollowupFeature {
  return (followupScope.included as readonly string[]).includes(feature);
}

export function isExplicitlyOutOfScope(
  feature: string,
): feature is OutOfScopeFeature {
  return (followupScope.excluded as readonly string[]).includes(feature);
}
