/** A new objective opens a fresh frame window. After a decision, hands must leave the frame. */
export function createGestureGate() {
  let after = Infinity;
  let release = false;
  let emptySince: number | undefined;
  let last = -Infinity;
  return {
    open(at: number, needsRelease: boolean) {
      after = at;
      last = -Infinity;
      release = needsRelease;
      emptySince = undefined;
    },
    accept(capturedAt: number, hasHands: boolean) {
      if (capturedAt < after || capturedAt <= last) return false;
      last = capturedAt;
      if (release) {
        if (hasHands) emptySince = undefined;
        else {
          emptySince ??= capturedAt;
          if (capturedAt - emptySince >= 120) release = false;
        }
      }
      return !release;
    },
    needsRelease: () => release,
  };
}
