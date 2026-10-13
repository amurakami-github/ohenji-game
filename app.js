import { ATTENTION_CUE, initialState, reduceState, presentation, photoStyle } from './data.js';
import { Voice } from './audio.js';
import { AutoAdvance } from './sequence.js';
import { Session } from './session.js';
import { ReplyMotion } from './reply-motion.js';

const $ = id => document.getElementById(id);
const motion = new ReplyMotion($('headMotion'));
let state = initialState();
let photoGeneration = 0;
let playbackGeneration = 0;
let photoReady = Promise.resolve();
let pendingPlayback = null;
let questionStarted = false;
let questionFinished = false;
let recordingsReady = false;
let silentTimer = null;
const images = new Map();
const SILENT_CUE_MS = 1000;
const session = new Session({ firstScene: new URLSearchParams(location.search).get('scene') });
const advance = new AutoAdvance({
  onAdvance: () => openScene(session.next()),
  allowed: () => state.phase === 'parent' && state.answer !== null && !document.hidden,
});
const voice = new Voice({
  onPlayback: event => {
    const view = presentation(state);
    const playing = event.state === 'playing' && (
      (state.phase === 'question' && event.key === `question-${state.sceneId}`)
      || (state.phase === 'attention' && event.key === view?.responseAudio));
    if (playing && state.phase === 'question') questionStarted = true;
    $('scenePhoto').dataset.playing = String(playing);
    $('speakingIndicator').hidden = !playing;
  },
});
voice.ready.then(() => {
  // The first answer tap must reach the recorded cue's media element, instead
  // of unlocking only speech synthesis while its recording list is loading.
  recordingsReady = true;
  updateAnswerAvailability();
});

function canAnswer() {
  return recordingsReady && !document.hidden && state.phase === 'question' && state.answer === null;
}
function updateAnswerAvailability() {
  const disabled = !canAnswer();
  $('answerYes').disabled = disabled;
  $('answerNo').disabled = disabled;
}
function cancelPlayback() {
  playbackGeneration += 1;
  pendingPlayback = null;
  advance.cancel();
  clearTimeout(silentTimer);
  silentTimer = null;
  voice.stop();
  motion.stop();
  updateAnswerAvailability();
}
function loadImage(source) {
  if (!images.has(source)) {
    const asset = { image: new Image(), loaded: false, failed: false };
    asset.ready = new Promise(resolve => {
      asset.image.onload = () => { asset.loaded = true; resolve(asset); };
      asset.image.onerror = () => { asset.failed = true; images.delete(source); resolve(asset); };
    });
    images.set(source, asset);
    asset.image.src = source;
  }
  return images.get(source);
}
function dispatch(action) {
  state = reduceState(state, action);
  render();
}
function updatePhotoCrop(view = presentation(state)) {
  if (!view) return;
  const photo = $('scenePhoto');
  const { width, height } = photo.getBoundingClientRect();
  const crop = view.singlePhoto
    ? { size: 'cover', position: '50% 50%' }
    : photoStyle(view.scene.id, view.frame, width > 0 && height > 0 ? width / height : 1);
  photo.style.backgroundSize = crop.size;
  photo.style.backgroundPosition = crop.position;
  if (view.replyFrames) motion.setCrop(null, width, height);
}
function render() {
  const view = presentation(state);
  $('questionTitle').textContent = view.scene.question;
  $('yesWord').textContent = view.scene.yes;
  $('noWord').textContent = view.scene.no;
  $('answerYes').setAttribute('aria-label', `うん、${view.scene.yes}`);
  $('answerNo').setAttribute('aria-label', `ううん、${view.scene.no}`);
  $('answerYes').setAttribute('aria-pressed', String(state.answer === 'yes'));
  $('answerNo').setAttribute('aria-pressed', String(state.answer === 'no'));
  updateAnswerAvailability();
  const photo = $('scenePhoto');
  photo.setAttribute('aria-label', view.phase === 'question'
    ? `${view.description}。${view.scene.question}` : view.description);
  photo.dataset.scene = view.scene.id;
  photo.dataset.phase = view.phase;
  motion.show(view.phase === 'child');
  updatePhotoCrop(view);
  $('replyStatus').textContent = ['parent', 'attention'].includes(view.phase) ? view.caption : view.reply;
  if (photo.dataset.source !== view.image) {
    motion.clear();
    photo.dataset.source = view.image;
    photo.style.backgroundImage = `url("${view.image}")`;
    $('photoFallback').hidden = true;
    photo.classList.add('loading');
    const generation = ++photoGeneration;
    const asset = loadImage(view.image);
    const loaded = () => {
      if (generation !== photoGeneration) return;
      photo.classList.remove('loading');
      $('photoFallback').hidden = !asset.failed;
      if (asset.loaded && (state.phase === 'question' || state.phase === 'child')) {
        motion.setPhoto(asset.image, view.scene.id, view.replyFrames);
      }
    };
    if (asset.loaded || asset.failed) {
      loaded();
      photoReady = Promise.resolve();
    } else photoReady = asset.ready.then(loaded);
  }
}

function continueAfterSpeech(next, gesture = Promise.resolve()) {
  if (next === 'child') afterPhotoPaint(showChild);
  else if (next === 'parent') {
    const generation = playbackGeneration;
    gesture.then(() => {
      if (generation === playbackGeneration && state.phase === 'child' && !document.hidden) showParent();
    });
  }
  else if (next === 'scene') advance.after(Promise.resolve());
}
function play(items, next = null) {
  const generation = ++playbackGeneration;
  advance.cancel();
  pendingPlayback = { items, next, retry: false };
  const gesture = next === 'parent' ? motion.play(state.answer) : Promise.resolve();
  // A reply tap starts the cue here, before any await can lose user activation.
  const completion = voice.speak(items);
  completion.then(result => {
    if (generation !== playbackGeneration || document.hidden) return;
    if (result.status === 'blocked') {
      motion.stop();
      pendingPlayback.retry = true;
      return;
    }
    if (['unavailable', 'cancelled'].includes(result.status)) {
      if (state.phase === 'question') {
        pendingPlayback.retry = true;
        return;
      }
      pendingPlayback = null;
      if (next === 'parent') continueAfterSpeech(next, gesture);
      else {
        silentTimer = setTimeout(() => {
          silentTimer = null;
          if (generation === playbackGeneration && !document.hidden) continueAfterSpeech(next, gesture);
        }, SILENT_CUE_MS);
      }
      return;
    }
    pendingPlayback = null;
    if (state.phase === 'question') questionFinished = true;
    continueAfterSpeech(next, gesture);
  });
}
function askQuestion() {
  const scene = presentation(state).scene;
  play([{ key: `question-${scene.id}`, text: `けいじゅ、${scene.question}` }]);
}
async function afterPhotoPaint(callback, { speechReady = false, motionReady = false } = {}) {
  const generation = playbackGeneration;
  const sceneId = state.sceneId;
  const phase = state.phase;
  await Promise.all([photoReady, speechReady ? voice.ready : Promise.resolve()]);
  if (motionReady) await motion.ready();
  // Let this phase's picture paint before beginning its speech.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (generation !== playbackGeneration || state.sceneId !== sceneId || state.phase !== phase || document.hidden) return;
  callback();
}
function playAfterPhoto(items, next = null) {
  afterPhotoPaint(() => play(items, next), { speechReady: true, motionReady: next === 'parent' });
}
function askAfterPhoto() {
  const scene = presentation(state).scene;
  playAfterPhoto([{ key: `question-${scene.id}`, text: `けいじゅ、${scene.question}` }]);
}
function showChild() {
  dispatch({ type: 'child' });
  const view = presentation(state);
  playAfterPhoto([{ key: view.scene[`${state.answer}Audio`], text: view.reply }], 'parent');
}
function showParent() {
  dispatch({ type: 'parent' });
  const view = presentation(state);
  playAfterPhoto([{ key: view.responseAudio, text: view.caption }], 'scene');
}
function openScene(id) {
  cancelPlayback();
  questionStarted = false;
  questionFinished = false;
  dispatch({ type: 'open', id });
  $('questionTitle').focus({ preventScroll: true });
  askAfterPhoto();
}
function answer(value) {
  if (!canAnswer()) return;
  cancelPlayback();
  dispatch({ type: 'answer', value });
  const view = presentation(state);
  // The cue image is preloaded while the question is on screen. Display it
  // immediately and play synchronously in this actual answer-button click.
  play([{ key: view.responseAudio, text: view.caption }], 'child');
}

$('answerYes').addEventListener('click', () => answer('yes'));
$('answerNo').addEventListener('click', () => answer('no'));
document.addEventListener('click', event => {
  if (!recordingsReady || !event.isTrusted || document.hidden || event.target.closest?.('#answerYes, #answerNo')) return;
  const pending = pendingPlayback;
  if (pending?.retry) play(pending.items, pending.next);
  else if (canAnswer() && !questionStarted && !questionFinished) {
    cancelPlayback();
    askQuestion();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelPlayback();
  else {
    updateAnswerAvailability();
    if (state.phase === 'parent') showParent();
    else if (state.phase === 'child') showChild();
    else if (state.phase === 'attention') {
      const view = presentation(state);
      playAfterPhoto([{ key: view.responseAudio, text: view.caption }], 'child');
    }
    else askAfterPhoto();
  }
});
window.addEventListener('pagehide', cancelPlayback);

// Reframe the current photograph on rotation/resizing without restarting speech.
if (typeof ResizeObserver === 'function') {
  new ResizeObserver(() => updatePhotoCrop()).observe($('scenePhoto'));
} else {
  window.addEventListener('resize', () => updatePhotoCrop());
}

// Start fetching the cue before the first question. No start screen is needed.
loadImage(ATTENTION_CUE.image);
openScene(session.next());

if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* Offline installation is optional. */ });
}
