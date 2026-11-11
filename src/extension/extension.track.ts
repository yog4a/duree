import { heartbeatForDocument, heartbeatForPath, type Machine } from "./extension.helpers";
import { shouldRecord, type Heartbeat } from "../heartbeat/heartbeat";
import { takeAi } from "./extension.journal";

export type TrackState = {
  lastByEntity: Map<string, number>;
  lineChanges: Map<string, number>;
  machine: Machine;
  record: (beat: Heartbeat) => boolean;
  refresh: () => void;
};

export function trackFile(state: TrackState, file: string, isWrite: boolean, debugging: boolean, building: boolean): void {
  const previous = state.lastByEntity.get(file);
  const time = Date.now() / 1000;
  if (!shouldRecord(previous, time, isWrite)) {
    return;
  }
  const ai = takeAi(file);
  const stats = ai.get(file);
  ai.delete(file);
  const saved = state.record(
    heartbeatForDocument(file, isWrite, time, stats, state.lineChanges.get(file) ?? 0, {
      ...state.machine,
      debugging,
      building,
    }),
  );
  if (!saved) {
    return;
  }
  state.lineChanges.delete(file);
  state.lastByEntity.set(file, time);
  for (const [other, otherStats] of ai) {
    const otherSaved = state.record(heartbeatForPath(other, time, otherStats, state.lineChanges.get(other) ?? 0, state.machine));
    if (!otherSaved) {
      return;
    }
    state.lineChanges.delete(other);
    state.lastByEntity.set(other, time);
  }
  state.refresh();
}

export function flushAi(state: TrackState, currentFile: string | null): void {
  const ai = takeAi(currentFile);
  if (ai.size === 0) {
    return;
  }
  const time = Date.now() / 1000;
  for (const [file, stats] of ai) {
    const saved = state.record(heartbeatForPath(file, time, stats, state.lineChanges.get(file) ?? 0, state.machine));
    if (!saved) {
      return;
    }
    state.lineChanges.delete(file);
    state.lastByEntity.set(file, time);
  }
  state.refresh();
}
