import { initialState, reduceState, presentation, photoStyle } from './data.js';
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
let attentionReady = false;
const session = new Session({ firstScene: new URLSearchParams(location.search).get('scene') });
const advance = new AutoAdvance({
  onAdvance: () => openScene(session.next()),
  allowed: () => state.phase === 'parent' && state.answer !== null && !document.hidden && $('startOverlay').hidden,
});
const voice = new Voice({
  onPlayback: event => {
    const view = presentation(state);
    const playing = event.state === 'playing' && (
      (state.phase === 'question' && event.key === `question-${state.sceneId}`)
      || (state.phase === 'attention' && event.key === view?.responseAudio));
    $('scenePhoto').dataset.playing = String(playing);
    $('speakingIndicator').hidden = !playing;
  },
});

function showStart(show, failed = false) {
  $('startOverlay').hidden = !show;
  $('game').inert = show;
  updateAnswerAvailability();
  if (show) {
    $('startLabel').textContent = failed ? 'もういちど' : 'はじめる';
    $('audioFailure').hidden = !failed;
    $('continueSilent').hidden = !failed;
    $('startButton').focus({ preventScroll: true });
  }
}
function canAnswer() {
  return !document.hidden && $('startOverlay').hidden
    && (state.phase === 'child' || state.phase === 'parent' || (state.phase === 'attention' && attentionReady));
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
  voice.stop();
  motion.stop();
  attentionReady = false;
  updateAnswerAvailability();
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
    photoReady = new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        if (generation === photoGeneration) {
          photo.classList.remove('loading');
          if (state.phase === 'question' || state.phase === 'child') motion.setPhoto(image, view.scene.id, view.replyFrames);
        }
        resolve();
      };
      image.onerror = () => {
        if (generation === photoGeneration) {
          photo.classList.remove('loading');
          $('photoFallback').hidden = false;
        }
        resolve();
      };
      image.src = view.image;
    });
  }
}

function continueAfterSpeech(next, gesture = Promise.resolve()) {
  if (next === 'attention') showAttention();
  else if (next === 'answer' && state.phase === 'attention' && !state.answer && !document.hidden) {
    attentionReady = true;
    updateAnswerAvailability();
  }
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
  pendingPlayback = { items, next };
  const gesture = next === 'parent' ? motion.play(state.answer) : Promise.resolve();
  // This call stays synchronous when reached from the initial start tap.
  const completion = voice.speak(items);
  completion.then(result => {
    if (generation !== playbackGeneration || document.hidden) return;
    if (result.status === 'blocked') {
      motion.stop();
      showStart(true);
      return;
    }
    if (['unavailable', 'cancelled'].includes(result.status)) {
      motion.stop();
      showStart(true, true);
      return;
    }
    pendingPlayback = null;
    continueAfterSpeech(next, gesture);
  });
}
function askQuestion() {
  const scene = presentation(state).scene;
  play([{ key: `question-${scene.id}`, text: `けいじゅ、${scene.question}` }], 'attention');
}
async function playAfterPhoto(items, next = null) {
  const generation = playbackGeneration;
  const sceneId = state.sceneId;
  const phase = state.phase;
  await Promise.all([photoReady, voice.ready]);
  if (next === 'parent') await motion.ready();
  // Let this phase's picture paint before beginning its speech.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (generation !== playbackGeneration || state.sceneId !== sceneId || state.phase !== phase || document.hidden) return;
  play(items, next);
}
function askAfterPhoto() {
  const scene = presentation(state).scene;
  playAfterPhoto([{ key: `question-${scene.id}`, text: `けいじゅ、${scene.question}` }], 'attention');
}
function showAttention() {
  attentionReady = false;
  dispatch({ type: 'attention' });
  const view = presentation(state);
  playAfterPhoto([{ key: view.responseAudio, text: view.caption }], 'answer');
}
function showParent() {
  dispatch({ type: 'parent' });
  const view = presentation(state);
  playAfterPhoto([{ key: view.responseAudio, text: view.caption }], 'scene');
}
function openScene(id) {
  cancelPlayback();
  showStart(false);
  dispatch({ type: 'open', id });
  $('questionTitle').focus({ preventScroll: true });
  askAfterPhoto();
}
function answer(value) {
  if (!canAnswer()) return;
  cancelPlayback();
  dispatch({ type: 'answer', value });
  const view = presentation(state);
  const items = [
    { key: value === 'yes' ? view.scene.yesAudio : view.scene.noAudio, text: view.reply },
  ];
  playAfterPhoto(items, 'parent');
}

$('answerYes').addEventListener('click', () => answer('yes'));
$('answerNo').addEventListener('click', () => answer('no'));
$('startButton').addEventListener('click', () => {
  const pending = pendingPlayback;
  showStart(false);
  if (pending) play(pending.items, pending.next);
  else if (state.phase === 'attention') {
    const view = presentation(state);
    play([{ key: view.responseAudio, text: view.caption }], 'answer');
  }
  else askQuestion();
  $('questionTitle').focus({ preventScroll: true });
});
$('continueSilent').addEventListener('click', () => {
  const next = pendingPlayback?.next;
  cancelPlayback();
  showStart(false);
  continueAfterSpeech(next, next === 'parent' ? motion.play(state.answer) : Promise.resolve());
  $('questionTitle').focus({ preventScroll: true });
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelPlayback();
  else {
    showStart(false);
    if (state.phase === 'parent') showParent();
    else if (state.answer) answer(state.answer);
    else if (state.phase === 'attention') showAttention();
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

openScene(session.next());

if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* Offline installation is optional. */ });
}
