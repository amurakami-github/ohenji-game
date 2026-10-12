export const RESULT_PAUSE_MS = 1800;

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

// One full shuffled round before repeating, including at cycle boundaries.
export class SceneDeck {
  constructor(ids, random = Math.random) {
    this.ids = [...new Set(ids)];
    if (!this.ids.length) throw new Error('At least one scene is required');
    this.random = random;
    this.remaining = [];
    this.last = null;
  }
  startAt(id) {
    if (!this.ids.includes(id)) return this.next();
    this.last = id;
    this.remaining = shuffle(this.ids.filter(item => item !== id), this.random);
    return id;
  }
  next() {
    if (!this.remaining.length) {
      this.remaining = shuffle(this.ids, this.random);
      if (this.remaining.length > 1 && this.remaining[0] === this.last) {
        const swap = 1 + Math.floor(this.random() * (this.remaining.length - 1));
        [this.remaining[0], this.remaining[swap]] = [this.remaining[swap], this.remaining[0]];
      }
    }
    this.last = this.remaining.shift();
    return this.last;
  }
}

// Both an in-flight voice promise and its following timer can be canceled.
export class AutoAdvance {
  constructor({ onAdvance, allowed = () => true, delay = RESULT_PAUSE_MS,
    setTimer = (callback, ms) => setTimeout(callback, ms),
    clearTimer = id => clearTimeout(id) }) {
    Object.assign(this, { onAdvance, allowed, delay, setTimer, clearTimer });
    this.generation = 0;
    this.timer = null;
  }
  cancel() {
    this.generation += 1;
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
  }
  async after(playback) {
    this.cancel();
    const generation = this.generation;
    try { await playback; } catch { /* The picture still communicates the answer. */ }
    if (this.generation !== generation || !this.allowed()) return;
    this.timer = this.setTimer(() => {
      this.timer = null;
      if (this.generation === generation && this.allowed()) this.onAdvance();
    }, this.delay);
  }
}
