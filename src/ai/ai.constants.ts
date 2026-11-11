export const MAX_LINE_CHARS = 1_500_000;
export const WALK_DEPTH = 6;
export const MAX_PLAN_LENGTH = 40;

export const SKIP_WALK = new Set(["old_string", "new_string", "content", "text", "command", "encrypted_content"]);

export const PLAN_KEYS = ["plan", "name", "subscriptionType"] as const;

export const SESSION_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
