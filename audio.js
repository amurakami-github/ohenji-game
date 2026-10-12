// A single cancellable channel prevents old questions/replies from overlapping.
export class Voice {
  constructor({ enabled = true, onUnavailable = () => {}, onPlayback = () => {} } = {}) {
    this.enabled = enabled;
    this.onUnavailable = onUnavailable;
    this.onPlayback = onPlayback;
    this.generation = 0;
    this.activeAudio = null;
    this.recordingAudio = null;
    this.settle = null;
    this.clips = {};
    this.synth = window.speechSynthesis;
    // Warm the voice list without delaying the first user-initiated utterance.
    try { this.synth?.getVoices(); } catch { /* Availability is checked when speaking. */ }
    // Screens await this before their first playback, while taps can still call
    // speak synchronously after the recording list is ready.
    this.ready = this.loadManifest();
  }
  async loadManifest() {
    try {
      const response = await fetch('./assets/audio/manifest.json');
      if (response.ok) this.clips = (await response.json()).clips ?? {};
    } catch { /* Browser speech remains available if the recording list fails. */ }
  }
  stop() {
    this.generation += 1;
    const audio = this.activeAudio;
    // Settle first: cancel() can synchronously dispatch a browser end/error event.
    this.settle?.();
    this.settle = null;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    this.activeAudio = null;
    try { this.synth?.cancel(); } catch { /* An unavailable engine still stops our queue. */ }
    this.activeUtterance = null;
    this.onPlayback({ state: 'idle' });
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    this.stop();
  }
  async speak(items) {
    this.stop();
    if (!this.enabled) return { status: 'disabled' };
    const generation = this.generation;
    for (const item of items) {
      if (this.generation !== generation || !this.enabled) return { status: 'cancelled' };
      // No await before play: speech starts inside the original click gesture.
      const result = await this.play(item, generation);
      if (this.generation !== generation || !this.enabled) return { status: 'cancelled' };
      if (result.status !== 'ended') {
        if (['blocked', 'unavailable'].includes(result.status)) {
          this.onUnavailable({ reason: result.reason, status: result.status });
        }
        return { status: result.status };
      }
    }
    return { status: 'ended' };
  }
  async play({ key, text }, generation) {
    const onStart = () => {
      if (this.generation === generation) this.onPlayback({ state: 'playing', key, text });
    };
    try {
      const clip = this.clips[key];
      if (clip) {
        const result = await this.playRecording(typeof clip === 'string' ? clip : clip.file, onStart);
        if (this.generation !== generation) return { status: 'cancelled' };
        // A gesture rejection needs an explicit retry, not a second blocked engine.
        if (result.status !== 'unavailable') return result;
      }
      if (this.generation !== generation) return { status: 'cancelled' };
      return await this.playSpeech(text, onStart);
    } finally {
      if (this.generation === generation) this.onPlayback({ state: 'idle', key, text });
    }
  }
  playRecording(file, onStart) {
    return new Promise(resolve => {
      let finished = false;
      let audio;
      try {
        // Keep one media element so the initial start tap also unlocks later
        // questions and replies on browsers with per-element autoplay rules.
        audio = this.recordingAudio ??= new Audio();
        audio.src = new URL(file, new URL('./assets/audio/', location.href)).href;
      } catch {
        resolve({ status: 'unavailable', reason: 'recording-unavailable' });
        return;
      }
      this.activeAudio = audio;
      const done = (status, reason) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        if (this.activeAudio === audio) this.activeAudio = null;
        if (this.settle === cancel) this.settle = null;
        audio.onended = null;
        audio.onerror = null;
        audio.onplaying = null;
        resolve({ status, reason });
      };
      const cancel = () => { audio.pause(); done('cancelled'); };
      const timeout = setTimeout(() => { audio.pause(); done('unavailable', 'recording-timeout'); }, 20000);
      this.settle = cancel;
      audio.onended = () => done('ended');
      audio.onerror = () => done('unavailable', 'recording-error');
      audio.onplaying = () => { if (!finished) onStart(); };
      const failed = error => done(error?.name === 'NotAllowedError' ? 'blocked' : 'unavailable',
        error?.name === 'NotAllowedError' ? 'not-allowed' : 'recording-error');
      try { Promise.resolve(audio.play()).catch(failed); } catch (error) { failed(error); }
    });
  }
  playSpeech(text, onStart) {
    return new Promise(resolve => {
      if (!this.synth || !window.SpeechSynthesisUtterance) {
        resolve({ status: 'unavailable', reason: 'speech-unavailable' });
        return;
      }
      let finished = false;
      let utterance;
      try {
        utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.82;
        const voices = this.synth.getVoices();
        const japanese = voices.filter(voice => voice.lang.toLowerCase().startsWith('ja'));
        utterance.voice = japanese.find(voice => voice.localService) ?? japanese[0] ?? null;
      } catch {
        resolve({ status: 'unavailable', reason: 'speech-unavailable' });
        return;
      }
      this.activeUtterance = utterance;
      let started = false;
      let startTimeout;
      let finishTimeout;
      const done = (status, reason) => {
        if (finished) return;
        finished = true;
        clearTimeout(startTimeout);
        clearTimeout(finishTimeout);
        if (this.settle === cancel) this.settle = null;
        if (this.activeUtterance === utterance) this.activeUtterance = null;
        resolve({ status, reason });
      };
      const cancel = () => done('cancelled');
      this.settle = cancel;
      startTimeout = setTimeout(() => {
        if (finished || started) return;
        // Some browsers silently ignore speech without a gesture. This result
        // requests a manual retry; it does not prove that permission was denied.
        done('blocked', 'start-timeout');
        try { this.synth.cancel(); } catch { /* The timeout already settled playback. */ }
      }, 2500);
      utterance.onend = () => done('ended');
      utterance.onstart = () => {
        if (finished || started) return;
        started = true;
        clearTimeout(startTimeout);
        finishTimeout = setTimeout(() => {
          if (finished) return;
          done('unavailable', 'speech-timeout');
          try { this.synth.cancel(); } catch { /* The timeout already settled playback. */ }
        }, 15000);
        onStart();
      };
      utterance.onerror = event => {
        if (finished) return;
        if (['canceled', 'interrupted'].includes(event.error)) done('cancelled');
        else done(event.error === 'not-allowed' ? 'blocked' : 'unavailable', event.error || 'speech-error');
      };
      try { this.synth.speak(utterance); } catch (error) {
        done(error?.name === 'NotAllowedError' ? 'blocked' : 'unavailable',
          error?.name === 'NotAllowedError' ? 'not-allowed' : 'speech-error');
      }
    });
  }
}
