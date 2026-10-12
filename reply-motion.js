export const REPLY_FRAME_MS = 450;
export const REPLY_DURATION_MS = REPLY_FRAME_MS * 6;

export function replyFrame(elapsed) {
  if (elapsed < 0 || elapsed >= REPLY_DURATION_MS) return 0;
  return Math.floor(elapsed / REPLY_FRAME_MS) % 2;
}

// Match CSS background-size: cover and background-position: center exactly.
// Only a full source photograph is scaled; the face is never warped or masked.
export function coverRectangle(imageWidth, imageHeight, width, height) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  return [(width - scaledWidth) / 2, (height - scaledHeight) / 2, scaledWidth, scaledHeight];
}

export class ReplyMotion {
  constructor(canvas) {
    this.canvas = canvas;
    this.pose = 0;
    this.visible = false;
    this.assetCache = new Map();
    this.assetReady = Promise.resolve();
    this.photoGeneration = 0;
    this.reducedMotion = typeof matchMedia === 'function'
      ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    try { this.context = canvas.getContext('2d'); } catch { this.context = null; }
  }

  setPhoto(image, sceneId, sources) {
    const generation = ++this.photoGeneration;
    this.image = image;
    this.sceneId = sceneId;
    this.frames = null;
    const source = sources?.[1];
    if (!this.context || !source) {
      this.assetReady = Promise.resolve();
      this.draw();
      return;
    }
    if (!this.assetCache.has(source)) {
      const pending = new Promise(resolve => {
        const second = new Image();
        second.onload = () => resolve(second);
        second.onerror = () => resolve(null);
        second.src = source;
      });
      this.assetCache.set(source, pending);
      pending.then(second => {
        if (!second && this.assetCache.get(source) === pending) this.assetCache.delete(source);
      });
    }
    this.assetReady = this.assetCache.get(source).then(second => {
      if (generation !== this.photoGeneration) return;
      this.frames = second ? [image, second] : null;
      this.draw();
    });
    this.draw();
  }

  ready() { return this.assetReady; }

  setCrop(_crop, width, height) {
    const density = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
    const w = Math.max(1, Math.round(width * density));
    const h = Math.max(1, Math.round(height * density));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.draw();
  }

  show(visible) { this.visible = visible; this.draw(); }

  draw() {
    const { canvas, context } = this;
    canvas.dataset.frame = String(this.pose);
    canvas.hidden = true;
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const image = this.frames?.[1];
    if (!image || !this.visible || this.pose !== 1) return;
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!(width > 0 && height > 0)) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, ...coverRectangle(width, height, canvas.width, canvas.height));
    canvas.hidden = false;
  }

  play(answer) {
    this.stop();
    this.answer = answer;
    this.canvas.dataset.direction = answer;
    this.canvas.dataset.running = 'true';
    let started;
    return new Promise(resolve => {
      this.resolve = resolve;
      const step = time => {
        if (started === undefined) started = time;
        const elapsed = time - started;
        const pose = elapsed >= REPLY_DURATION_MS ? 0 : this.reducedMotion.matches ? 1 : replyFrame(elapsed);
        if (pose !== this.pose) { this.pose = pose; this.draw(); }
        if (elapsed < REPLY_DURATION_MS) this.frame = requestAnimationFrame(step);
        else {
          this.frame = null;
          this.canvas.dataset.running = 'false';
          this.resolve = null;
          resolve();
        }
      };
      this.frame = requestAnimationFrame(step);
    });
  }

  stop() {
    if (this.frame != null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.pose = 0;
    this.canvas.dataset.running = 'false';
    if (this.resolve) this.resolve();
    this.resolve = null;
    this.draw();
  }

  clear() {
    this.stop();
    this.photoGeneration += 1;
    this.image = null;
    this.frames = null;
    this.assetReady = Promise.resolve();
    this.canvas.hidden = true;
  }
}
