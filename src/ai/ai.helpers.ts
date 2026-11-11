import { MAX_PLAN_LENGTH, PLAN_KEYS, SESSION_ID } from "./ai.constants";

export function sessionOf(obj: Record<string, unknown>): string | null {
  if (typeof obj.sessionId === "string") {
    return obj.sessionId;
  }
  const payload = asRecord(obj.payload);
  if (!payload) {
    return null;
  }
  if (typeof payload.session_id === "string") {
    return payload.session_id;
  }
  if (typeof payload.thread_id === "string") {
    return payload.thread_id;
  }
  return null;
}

export function sessionFromPath(filePath: string): string | null {
  const match = SESSION_ID.exec(filePath);
  return match ? match[0] : null;
}

export function planOf(obj: Record<string, unknown>): string | null {
  const payload = asRecord(obj.payload);
  const candidates = [obj.subscription, obj.subscription_plan, obj.subscriptionPlan, payload?.subscription];
  for (const candidate of candidates) {
    const plan = shortPlan(candidate);
    if (plan) {
      return plan;
    }
  }
  return null;
}

export function textLength(content: unknown): number {
  if (typeof content === "string") {
    return content.length;
  }
  if (Array.isArray(content)) {
    let total = 0;
    for (const part of content) {
      total += textLength(part);
    }
    return total;
  }
  if (!content || typeof content !== "object") {
    return 0;
  }
  const record = content as Record<string, unknown>;
  if (typeof record.text === "string") {
    return record.text.length;
  }
  if (record.content !== undefined && record.content !== content) {
    return textLength(record.content);
  }
  return 0;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function shortPlan(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0 && value.length <= MAX_PLAN_LENGTH && !value.includes(" ")) {
    return value;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of PLAN_KEYS) {
    const inner = record[key];
    if (typeof inner === "string" && inner.length > 0 && inner.length <= MAX_PLAN_LENGTH && !inner.includes(" ")) {
      return inner;
    }
  }
  return null;
}
