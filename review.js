import { SCENES, presentation, photoStyle } from './data.js';
import { ReplyMotion } from './reply-motion.js';
import { Voice } from './audio.js';

const $ = id => document.getElementById(id);
const imageCache = new Map();
const sections = new Map();
const cards = new Set();
let active = null;
let generation = 0;
let dialogCard = null;
const voice = new Voice({
  onPlayback: event => {
    if (event.state === 'playing') $('playbackStatus').textContent = `読み上げ中：「${event.text}」`;
  },
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// The live game's presentation determines every picture, reply and result.
// Questions use the same name prefix as app.js.
function stagesFor(scene) {
  const stage = (phase, answer, title) => {
    const view = presentation({ screen: 'scene', sceneId: scene.id, phase, answer });
    const speech = phase === 'question' ? { key: `question-${scene.id}`, text: `けいじゅ、${scene.question}` }
      : phase === 'child' ? { key: scene[`${answer}Audio`], text: view.reply }
        : { key: view.responseAudio, text: view.caption };
    return { scene, phase, answer, title, view, speech };
  };
  return [stage('question', null, '① お母さんの質問'),
    stage('attention', null, '② 目を見て'),
    stage('child', 'yes', '③ 慧樹の返事 · うん'), stage('parent', 'yes', '④ お母さんの返答 · うんの後'),
    stage('child', 'no', '③ 慧樹の返事 · ううん'), stage('parent', 'no', '④ お母さんの返答 · ううんの後')];
}

function loadImage(source) {
  if (!imageCache.has(source)) {
    imageCache.set(source, new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { imageCache.delete(source); resolve(null); };
      image.src = source;
    }));
  }
  return imageCache.get(source);
}

function crop(card) {
  const { width, height } = card.photo.getBoundingClientRect();
  if (!width || !height) return;
  const { view, scene } = card.stage;
  const style = view.singlePhoto ? { size: 'cover', position: '50% 50%' } : photoStyle(scene.id, view.frame, width / height);
  card.photo.style.backgroundSize = style.size;
  card.photo.style.backgroundPosition = style.position;
  if (card.motion) card.motion.setCrop(null, width, height);
}

function staticPose(card) {
  if (!card?.motion) return;
  card.motion.stop();
  card.motion.answer = card.stage.answer;
  card.motion.pose = 0;
  card.motion.show(true);
}

async function loadCard(card) {
  if (card.loading) return card.loading;
  card.loading = (async () => {
    const [image] = await Promise.all([loadImage(card.stage.view.image), voice.ready]);
    if (!image) {
      card.note.textContent = '写真を読み込めませんでした。ページを再読み込みしてください。';
      card.root.dataset.ready = 'error';
      card.play.disabled = false;
      return;
    }
    card.photo.style.backgroundImage = `url("${card.stage.view.image}")`;
    crop(card);
    if (card.motion) {
      card.motion.setPhoto(image, card.stage.scene.id, card.stage.view.replyFrames);
      await card.motion.ready();
      staticPose(card);
    }
    const missing = card.motion && !card.motion.frames;
    card.note.hidden = !missing;
    if (missing) card.note.textContent = '返事の写真を読み込めませんでした。ページを再読み込みしてください。';
    card.root.dataset.ready = missing ? 'error' : 'true';
    card.play.disabled = false;
  })();
  return card.loading;
}

function stopPlayback(message = '再生を停止しました。') {
  generation += 1;
  voice.stop();
  if (active) {
    active.play.setAttribute('aria-pressed', 'false');
    active.play.textContent = active.playLabel;
    active.root.classList.remove('playing');
    staticPose(active);
  }
  active = null;
  $('stopPlayback').disabled = true;
  if (message) $('playbackStatus').textContent = message;
}

async function playCard(card) {
  if (active === card) { stopPlayback(); return; }
  stopPlayback(null);
  const token = generation;
  active = card;
  card.play.textContent = '■ 停止';
  card.play.setAttribute('aria-pressed', 'true');
  card.root.classList.add('playing');
  $('stopPlayback').disabled = false;
  $('playbackStatus').textContent = `再生中：「${card.stage.speech.text}」`;
  // No asynchronous wait before speech: retain this tap's playback permission.
  const speech = voice.speak([card.stage.speech]);
  const motion = card.motion ? card.motion.play(card.stage.answer) : Promise.resolve();
  const [result] = await Promise.all([speech, motion]);
  if (token !== generation) return;
  stopPlayback(result.status === 'ended' ? `再生しました：「${card.stage.speech.text}」`
    : '音声を再生できませんでした。端末の音量を確認して、もう一度押してください。');
}

function makeCard(stage, expanded = false) {
  const root = element('article', 'stage');
  root.dataset.phase = stage.phase;
  root.dataset.scene = stage.scene.id;
  if (stage.answer) root.dataset.answer = stage.answer;
  root.dataset.ready = 'false';
  root.append(element('h3', 'stage-title', stage.title));
  const photo = element('div', 'photo');
  photo.setAttribute('role', 'img');
  photo.setAttribute('aria-label', stage.view.description);
  const note = element('span', 'loading-note', '写真を読み込み中…');
  let motion = null;
  if (stage.phase === 'child') {
    const canvas = element('canvas');
    canvas.hidden = true;
    canvas.setAttribute('aria-hidden', 'true');
    photo.append(canvas);
    motion = new ReplyMotion(canvas);
  }
  photo.append(note);
  if (expanded) root.append(photo);
  else {
    const zoom = element('button', 'photo-button');
    zoom.type = 'button';
    zoom.setAttribute('aria-label', `${stage.scene.question} ${stage.title}の写真を拡大`);
    zoom.append(photo, element('span', 'zoom-hint', '拡大 ↗'));
    zoom.addEventListener('click', () => openPhoto(stage));
    root.append(zoom);
  }
  const copy = element('div', 'stage-copy');
  const speech = element('p', 'speech', stage.speech.text);
  const playLabel = stage.phase === 'child' ? '▶ 声と動きを確認' : '▶ 声を聞く';
  const play = element('button', 'play-button', playLabel);
  play.type = 'button';
  play.disabled = true;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-label', `${stage.speech.text} を再生`);
  copy.append(speech, play);
  root.append(copy);
  const card = { root, photo, note, motion, stage, play, playLabel };
  play.addEventListener('click', () => playCard(card));
  cards.add(card);
  return card;
}

async function openPhoto(stage) {
  stopPlayback(null);
  if (dialogCard) { dialogCard.motion?.clear(); cards.delete(dialogCard); }
  dialogCard = makeCard(stage, true);
  $('dialogTitle').textContent = `${stage.scene.question} ／ ${stage.title}`;
  $('dialogPhoto').replaceChildren(dialogCard.root);
  $('photoDialog').showModal();
  await loadCard(dialogCard);
}

for (const [index, scene] of SCENES.entries()) {
  const number = String(index + 1).padStart(2, '0');
  const title = `${number} ${scene.question}`;
  const link = element('a', null, title);
  link.href = `#scene-${scene.id}`;
  $('sceneIndex').append(link);
  const option = element('option', null, title);
  option.value = scene.id;
  $('sceneSelect').append(option);
  const section = element('section', 'scene');
  section.id = `scene-${scene.id}`;
  const heading = element('div', 'scene-heading');
  heading.append(element('span', 'scene-number', number), element('h2', null, scene.question));
  const game = element('a', null, 'この場面で遊ぶ ↗');
  game.href = `./?scene=${scene.id}`;
  heading.append(game);
  const story = element('div', 'story');
  const sceneCards = stagesFor(scene).map(stage => makeCard(stage));
  for (const card of sceneCards) story.append(card.root);
  section.append(heading, story);
  $('scenes').append(section);
  sections.set(scene.id, { section, cards: sceneCards });
}

const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const item = sections.get(entry.target.id.slice(6));
    item.cards.forEach(loadCard);
    observer.unobserve(entry.target);
  }
}, { rootMargin: '700px 0px' });
sections.forEach(item => observer.observe(item.section));
new ResizeObserver(() => { for (const card of cards) crop(card); }).observe(document.body);

function syncSceneSelection() {
  const id = location.hash.replace('#scene-', '');
  if (sections.has(id)) {
    $('sceneSelect').value = id;
    sections.get(id).cards.forEach(loadCard);
  }
}
$('sceneSelect').addEventListener('change', () => { location.hash = `scene-${$('sceneSelect').value}`; });
window.addEventListener('hashchange', syncSceneSelection);
syncSceneSelection();
$('stopPlayback').addEventListener('click', () => stopPlayback());
$('closeDialog').addEventListener('click', () => $('photoDialog').close());
$('photoDialog').addEventListener('close', () => {
  stopPlayback(null);
  if (dialogCard) { dialogCard.motion?.clear(); cards.delete(dialogCard); dialogCard = null; }
  $('dialogPhoto').replaceChildren();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(null); });
window.addEventListener('pagehide', () => stopPlayback(null));
