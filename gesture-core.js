// Continuous palm opening, independent of camera pixels and hand size.
// Prefer MediaPipe worldLandmarks (3D); fall back to normalized image landmarks.
const FINGERS = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function length(a, b, useDepth) {
  return Math.hypot(a.x - b.x, a.y - b.y, useDepth ? (a.z ?? 0) - (b.z ?? 0) : 0);
}

export function fingerStraightness(points, [mcp, pip, dip, tip], useDepth = true) {
  const boneLength = length(points[mcp], points[pip], useDepth)
    + length(points[pip], points[dip], useDepth)
    + length(points[dip], points[tip], useDepth);
  if (boneLength < 1e-6) return null;
  return clamp(length(points[mcp], points[tip], useDepth) / boneLength, 0, 1);
}

export function measurePalm(landmarks, worldLandmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) return null;
  const useWorld = Array.isArray(worldLandmarks) && worldLandmarks.length >= 21;
  const points = useWorld ? worldLandmarks : landmarks;
  const ratios = FINGERS.map((finger) => fingerStraightness(points, finger, useWorld));
  if (ratios.some((ratio) => ratio === null || !Number.isFinite(ratio))) return null;
  const straightness = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  // A fist gives shorter fingertip-to-knuckle chords; extended fingers approach 1.
  const openness = ratios.reduce((sum, ratio) => sum + clamp((ratio - .50) / (.90 - .50), 0, 1), 0) / ratios.length;
  const palm = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
  const x = palm.reduce((sum, point) => sum + point.x, 0) / palm.length;
  const y = palm.reduce((sum, point) => sum + point.y, 0) / palm.length;
  const palmSpan = length(landmarks[5], landmarks[17], false);
  return { openness, straightness, x, y, palmSpan, usingWorld: useWorld };
}

export class HandOpenness {
  constructor({ lostMs = 320, smoothMs = 65, frameCount = 29 } = {}) {
    this.lostMs = lostMs;
    this.smoothMs = smoothMs;
    this.frameCount = frameCount;
    this.reset();
  }

  reset() {
    this.lastSeenAt = null;
    this.openness = null;
  }

  update(landmarks, worldLandmarks, now) {
    const measured = measurePalm(landmarks, worldLandmarks);
    if (!measured) {
      const visible = this.lastSeenAt !== null && now - this.lastSeenAt < this.lostMs;
      if (!visible) this.reset();
      return { visible, uncertain: Boolean(landmarks), openness: this.openness, frame: this.openness === null ? null : Math.round((1 - this.openness) * (this.frameCount - 1)) };
    }
    const elapsed = this.lastSeenAt === null ? 0 : Math.max(0, now - this.lastSeenAt);
    const blend = this.openness === null ? 1 : 1 - Math.exp(-elapsed / this.smoothMs);
    this.openness = this.openness === null ? measured.openness : this.openness + (measured.openness - this.openness) * blend;
    this.lastSeenAt = now;
    return {
      ...measured, visible: true, uncertain: false,
      openness: this.openness,
      frame: Math.round((1 - this.openness) * (this.frameCount - 1)),
    };
  }
}

// Keep the first interacting hand in control even if MediaPipe changes result order.
export function assignHands(landmarks = [], previousPalm = null) {
  const hands = landmarks.map((points, index) => ({ index, palm: measurePalm(points) }));
  if (!hands.length) return { primary: -1, secondary: -1 };
  let primary = 0;
  if (previousPalm && hands.length > 1) {
    primary = hands.reduce((best, hand, index) => {
      const distance = Math.hypot(hand.palm.x - previousPalm.x, hand.palm.y - previousPalm.y);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
  }
  return { primary: hands[primary].index, secondary: hands.find((hand) => hand.index !== primary)?.index ?? -1 };
}

export class SecondHandSwipe {
  constructor({ minDistance = .13, palmWidths = 1.15, maxMs = 850, minMs = 70, maxVertical = .13, rearmDistance = .10, lostMs = 320, minOpen = .55, cooldownMs = 450 } = {}) {
    this.minDistance = minDistance;
    this.palmWidths = palmWidths;
    this.maxMs = maxMs;
    this.minMs = minMs;
    this.maxVertical = maxVertical;
    this.rearmDistance = rearmDistance;
    this.lostMs = lostMs;
    this.minOpen = minOpen;
    this.cooldownMs = cooldownMs;
    this.reset();
  }

  reset() {
    this.origin = null;
    this.lastSeenAt = null;
    this.armed = true;
    this.triggerX = null;
    this.cooldownUntil = 0;
  }

  update(reading, now) {
    if (!reading || !Number.isFinite(reading.x) || !Number.isFinite(reading.y)) {
      if (this.lastSeenAt !== null && now - this.lastSeenAt >= this.lostMs) this.reset();
      return { progress: 0, triggered: false, visible: false, armed: this.armed };
    }
    if (this.lastSeenAt !== null && now - this.lastSeenAt >= this.lostMs) this.reset();
    this.lastSeenAt = now;
    // The preview is mirrored: a leftward screen swipe increases raw camera x.
    const x = 1 - reading.x, y = reading.y;
    if (reading.openness < this.minOpen) {
      this.origin = null;
      if (reading.openness < .35) this.armed = true;
      return { progress: 0, triggered: false, visible: true, armed: this.armed };
    }
    if (!this.armed) {
      if (now >= this.cooldownUntil && x >= this.triggerX + this.rearmDistance) {
        this.armed = true;
        this.origin = { x, y, at: now };
      } else return { progress: 0, triggered: false, visible: true, armed: false };
    }
    if (!this.origin) this.origin = { x, y, at: now };
    let elapsed = now - this.origin.at;
    if (elapsed > this.maxMs || Math.abs(y - this.origin.y) > this.maxVertical || x > this.origin.x + .04) {
      this.origin = { x, y, at: now };
      elapsed = 0;
    }
    const required = Math.max(this.minDistance, (reading.palmSpan ?? 0) * this.palmWidths);
    const progress = clamp((this.origin.x - x) / required, 0, 1);
    const triggered = progress >= 1 && elapsed >= this.minMs && Math.abs(y - this.origin.y) <= Math.max(.07, required * .7);
    if (triggered) {
      this.armed = false;
      this.triggerX = x;
      this.cooldownUntil = now + this.cooldownMs;
      this.origin = null;
    }
    return { progress, triggered, visible: true, armed: this.armed };
  }
}
