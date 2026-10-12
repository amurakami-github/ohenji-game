const HANDOVER_SCENES = new Set(['ice-cream', 'water', 'yogurt', 'ipad', 'plarail', 'meal', 'chocolate']);

// Each reply is photographed at its final close-up framing. Biima retains its
// blue school shirt; every other scene uses the child's usual striped shirt.
export const REPLY_PHOTOS = Object.freeze(Object.fromEntries(['common', 'biima'].map(outfit => {
  const prefix = outfit === 'biima' ? 'biima-' : '';
  return [outfit, Object.freeze({
    yes: Object.freeze(['yes-front', 'yes-nod'].map(pose => `./assets/replies/${prefix}${pose}.png`)),
    no: Object.freeze(['no-left', 'no-right'].map(pose => `./assets/replies/${prefix}${pose}.png`)),
  })];
})));

export const ATTENTION_CUE = Object.freeze({
  image: './assets/cues/mom-eyes.png',
  text: '目を見て',
  audio: 'cue-look-at-me',
  description: '慧樹の目線から見たママの顔のアップ。ママが正面を向き、優しくこちらを見ています',
});

export const SCENES = Object.freeze([
  { id: 'ice-cream', label: 'アイス', question: 'アイス、たべる？', yes: 'たべる', no: 'いらない', yesAudio: 'yes-eat', noAudio: 'no-need', tag: 'たべる', object: '青と白のカップのハーゲンダッツ「ザ・ミルク」', before: 'ママはアイスを見せずに、食べるか言葉で聞いて返事を待っています', yesResponseImage: './assets/responses/ice-cream-yes-handover.png', noResponseImage: './assets/responses/milk-no-offer.png', yesResponseDescription: 'うんと答えた後、ママが初めてアイスを見せて慧樹に手渡しています', afterYes: '慧樹が空の手を休め、まだ受け取らずにママへうなずいて返事をしています', afterNo: 'アイスは受け取らないとママに伝えます' },
  { id: 'water', label: 'おみず', question: 'おみず、のむ？', yes: 'のむ', no: 'いらない', yesAudio: 'yes-drink', noAudio: 'no-need', tag: 'のむ', object: '青とオレンジの水筒', before: 'ママは水筒を見せずに、水を飲むか言葉で聞いて返事を待っています', yesResponseDescription: 'ママから水筒を受け取ります', afterYes: '慧樹が空の手を休め、まだ受け取らずにママへうなずいて返事をしています', afterNo: 'ママが水筒を引いて、返事を受け止めます' },
  { id: 'yogurt', label: 'ヨーグルト', question: 'ヨーグルト、たべる？', yes: 'たべる', no: 'いらない', yesAudio: 'yes-eat', noAudio: 'no-need', tag: 'たべる', object: '青白の容器の明治ブルガリアヨーグルト・ジューシー果実ブルーベリー', before: 'ママはヨーグルトを見せずに、食べるか言葉で聞いて返事を待っています', yesResponseDescription: 'ママからヨーグルトを受け取ります', afterYes: '慧樹が空の手を休め、まだ受け取らずにママへうなずいて返事をしています', afterNo: 'ママがヨーグルトを引いて、返事を受け止めます' },
  { id: 'ipad', label: 'iPad', question: 'アイパッド、やる？', yes: 'やる', no: 'やらない', yesAudio: 'yes-ipad', noAudio: 'no-ipad', yesCaption: 'アイパッドどうぞ。', yesResponseAudio: 'response-ipad-yes', tag: 'あそぶ', object: 'iPad', before: 'ママはiPadを見せずに、やるか言葉で聞いて返事を待っています', yesResponseDescription: 'うんと答えた後、ママが初めてiPadを見せて慧樹に手渡しています', afterYes: '慧樹が空の手を休め、まだ受け取らずにママへうなずいて返事をしています', afterNo: 'ママがiPadを引いて、返事を受け止めます' },
  { id: 'plarail', label: 'プラレール', question: 'プラレール、やる？', yes: 'やる', no: 'やらない', yesAudio: 'yes-play', noAudio: 'no-play', yesCaption: 'プラレールどうぞ。', yesResponseAudio: 'response-plarail-yes', tag: 'あそぶ', object: 'プラレールの電車と青いレール', before: 'ママはプラレールを見せずに、やるか言葉で聞いて返事を待っています', yesResponseDescription: 'プラレールで遊びます', afterYes: '慧樹が空の手を休め、まだ受け取らずにママへうなずいて返事をしています', afterNo: 'ママがプラレールを引いて、返事を受け止めます' },
  {
    id: 'toilet', kind: 'body', label: 'うんち', question: 'うんちでた？',
    yes: 'でた', no: 'でてない', yesAudio: 'yes-toilet', noAudio: 'no-toilet',
    yesCaption: 'うんちでたね。', noCaption: 'でてないね',
    yesResponseAudio: 'response-toilet-yes', noResponseAudio: 'response-toilet-no',
    yesResponseImage: './assets/responses/toilet-yes.png',
    yesResponseDescription: '慧樹が仰向けに寝転がり、ママがおむつを替え終えて、ドラえもん柄のマミーポコのおむつを整えています',
    tag: 'からだ', object: 'トイレ',
    before: 'ママがうんちが出たか聞き、返事を待っています',
    afterYes: 'おしりに手を当てて、うんちが出たとママに伝えます',
    afterNo: 'うんちは出ていないとママに伝えます',
  },
  {
    id: 'diaper', label: 'おむつ', question: 'おむつかえる？',
    yes: 'かえる', no: 'かえない', yesAudio: 'yes-change', noAudio: 'no-change',
    yesCaption: 'おむつ、かえようね。', yesResponseAudio: 'response-diaper-yes',
    yesResponseImage: './assets/responses/diaper-yes.png',
    yesResponseDescription: '慧樹が仰向けに寝転がり、ママがおむつを替え終えて、ドラえもん柄のマミーポコのおむつを整えています',
    noResponseDescription: '慧樹は服を着たままで、ママが頭を優しくなで、おむつを替えないという返事を受け止めています',
    tag: 'くらし', object: 'ドラえもん柄のマミーポコのおむつ',
    before: 'ママが新しいおむつを見せて、おむつを替えるか聞き、返事を待っています',
    afterYes: '慧樹が服を着たまま、まだおむつを替えずにママへうなずいて返事をしています',
    afterNo: 'おむつを替えないとママに伝えます',
  },
  {
    id: 'sleep', label: 'ねる', question: 'ねる？',
    yes: 'ねる', no: 'ねない', yesAudio: 'yes-sleep', noAudio: 'no-sleep',
    yesCaption: 'おやすみ', yesResponseAudio: 'response-sleep-yes',
    yesResponseImage: './assets/responses/sleep-yes.png',
    yesResponseDescription: '慧樹が布団をかけて静かに眠り、ママがそばで見守っています',
    tag: 'ねる', object: 'ベッドと枕',
    before: '寝室でママが寝るか聞き、返事を待っています',
    afterYes: '慧樹が目を開けて座り、まだ寝ずにママへうなずいて返事をしています',
    afterNo: '寝ないとママに伝えます',
  },
  {
    id: 'meal', label: 'ごはん', question: 'ごはん、たべる？',
    yes: 'たべる', no: 'たべない', yesAudio: 'yes-eat', noAudio: 'no-eat',
    tag: 'たべる', object: 'ごはんとおかず', responseCard: 'milk',
    before: 'ママはごはんを見せずに、食べるか言葉で聞いて返事を待っています',
    yesResponseDescription: 'ごはんを食べるとママに伝え、茶碗を受け取ります', afterYes: '慧樹が空の手を休め、まだ受け取らずにママへうなずいて返事をしています',
    afterNo: 'ごはんを食べないとママに伝えます',
  },
  {
    id: 'bath', label: 'おふろ', question: 'おふろ、いく？',
    yes: 'いく', no: 'いかない', yesAudio: 'yes-go', noAudio: 'no-go',
    yesCaption: 'おふろだよ。', yesResponseAudio: 'response-bath-yes',
    yesResponseImage: './assets/responses/bath-yes-doorway.png',
    yesResponseDescription: '慧樹は服を着たまま浴室の外に立ち、ママがドアを開けて浴槽を見せています',
    noResponseImage: './assets/responses/bath-no-living.png',
    noResponseDescription: 'リビングでママが慧樹の頭を優しくなで、おふろには行かない返事を受け止めています。浴室や浴槽は見えません',
    tag: 'くらし', object: 'おふろ',
    before: 'リビングでママがおふろに行くか言葉で聞いて返事を待っています。浴室・浴槽・タオルは見えません',
    afterYes: '慧樹が服を着たまま、ママへうなずいて返事をしています',
    afterNo: 'おふろには行かないとママに伝えます',
  },
  {
    id: 'pajamas', label: 'パジャマ', question: 'パジャマ、きる？',
    yes: 'きる', no: 'きない', yesAudio: 'yes-wear', noAudio: 'no-wear',
    yesCaption: 'きがえたね', yesResponseAudio: 'response-pajamas-yes',
    yesResponseImage: './assets/responses/pajamas-yes.png',
    yesResponseDescription: '慧樹がクリーム色のプーさん柄の上着と茶色の長ズボンのパジャマに着替え、ママがそばで微笑んでいます',
    tag: 'くらし', object: 'クリーム色のプーさん柄の上着と茶色の長ズボンのパジャマ',
    before: '寝室でママがパジャマを見せて、返事を待っています',
    afterYes: '慧樹が普段着のまま、まだパジャマを受け取らずにママへうなずいて返事をしています',
    afterNo: 'パジャマは着ないとママに伝えます',
  },
  {
    id: 'biima', label: 'biima', question: 'ビーマ、いく？',
    yes: 'いく', no: 'いかない', yesAudio: 'yes-go', noAudio: 'no-go',
    yesCaption: 'ビーマ、きたよ。', yesResponseAudio: 'response-biima-yes',
    yesResponseImage: './assets/responses/biima-yes.png',
    yesResponseDescription: '青いビーマの服と黒い長ズボンの慧樹が、靴を履いてリュックを背負い、ママとビーマの入口に到着しました',
    noResponseDescription: '家の玄関でママが慧樹の頭を優しくなで、行かないという返事を受け止めています',
    tag: 'おでかけ', object: 'biima school 芝浦アイランド校への登園',
    before: '家の玄関でママがビーマに行くか聞き、返事を待っています',
    afterYes: '家で慧樹が空の手を休め、まだ出発せずにママへうなずいて返事をしています',
    afterNo: '家でビーマには行かないとママに伝えます',
  },
  {
    id: 'ninja-park', label: 'ニンジャパーク', question: 'ニンジャパーク、いく？',
    yes: 'いく', no: 'いかない', yesAudio: 'yes-go', noAudio: 'no-go',
    yesCaption: 'ニンジャパーク、きたよ。', yesResponseAudio: 'response-ninja-park-yes',
    image: './assets/gestures/ninja-park.png', responseCard: 'plarail',
    yesResponseImage: './assets/responses/ninja-park-yes.png',
    noResponseImage: './assets/responses/plarail-no-offer.png',
    yesResponseDescription: '慧樹がママとニンジャパークのボールプールに到着しました。赤いすべり台と黄色い柵が見えます',
    noResponseDescription: '家でママが慧樹の頭を優しくなで、行かないという返事を受け止めています',
    tag: 'おでかけ', object: 'ニンジャパークのボールプールと赤いすべり台',
    before: '家でママがニンジャパークに行くか言葉で聞き、返事を待っています',
  },
  {
    id: 'chocolate', label: 'チョコ', question: 'チョコ、たべる？',
    yes: 'たべる', no: 'たべない', yesAudio: 'yes-eat', noAudio: 'no-eat',
    tag: 'たべる', object: 'GOONAの白茶の袋と白い小皿の丸いチョコレート',
    before: 'ママはチョコを見せずに、食べるか言葉で聞いて返事を待っています',
    yesResponseDescription: 'チョコを食べるとママに伝え、受け取ります', afterYes: '慧樹が空の手を休め、まだ受け取らずにママへうなずいて返事をしています',
    afterNo: 'チョコは食べないとママに伝えます',
  },
  ...[
    { id: 'ice-cream-taste', card: 'ice-cream', label: 'アイス', object: '青と白のカップのハーゲンダッツ「ザ・ミルク」', action: 'アイスをひと口食べて', before: '慧樹がアイスを食べて喜んでいる様子を見て、ママが味の感想を聞いています' },
    { id: 'yogurt-taste', card: 'yogurt', label: 'ヨーグルト', object: '青白の容器のブルーベリーヨーグルト', action: 'ヨーグルトをひと口食べて' },
  ].map(item => ({
    ...item, kind: 'taste', tag: 'おいしい？', question: `${item.label}、おいしい？`,
    yes: 'おいしい', no: 'おいしくない', yesAudio: 'yes-taste', noAudio: 'no-taste',
    yesCaption: 'おいしいね', noCaption: 'おいしくないね',
    yesResponseAudio: 'response-taste-yes', noResponseAudio: 'response-taste-no',
    before: item.before ?? `${item.action}、ママに味の感想を聞かれています`,
    afterYes: `${item.object}がおいしいと伝え、ママが受け止めます`,
    afterNo: `${item.object}がおいしくないと伝え、ママが受け止めます`,
  })),
].map(scene => Object.freeze({
  kind: 'offer', card: scene.id, ...scene,
  image: scene.image ?? `./assets/scenes/${scene.id}.png`,
  responseImage: `./assets/responses/${scene.responseCard ?? scene.card ?? scene.id}.png`,
  afterYes: '正面から見た慧樹の顔のアップ。にっこりして首を縦に振って、うんと返事をしています',
  afterNo: '正面から見た慧樹の顔と胸元のアップ。嫌な顔で両腕をクロスしてバツを作り、首を横に振って、ううんと返事をしています',
  // Keep objects out of the question, both reply poses and the NO outcome.
  // The original receiving/playing photo is revealed only after YES completes.
  ...(HANDOVER_SCENES.has(scene.id) ? {
    image: `./assets/gestures/${scene.id}.png`,
    noResponseImage: scene.noResponseImage ?? `./assets/responses/${scene.responseCard ?? scene.id}-no-offer.png`,
    noResponseDescription: 'ママは品物を出さず、慧樹の頭を優しくなでて返事を受け止めています',
    ...(scene.yesResponseImage ? {} : scene.id === 'ipad'
      ? { yesResponseImage: './assets/responses/ipad-yes-handover.png' }
      : { yesResponseImage: `./assets/scenes/${scene.id}.png`, yesResponseFrame: 1 }),
  } : {}),
})));

export const initialState = () => ({ screen: 'home', sceneId: null, answer: null, phase: 'question' });

// Crop inside one panel at the displayed aspect ratio. The two percentage sizes
// then produce the same horizontal/vertical scale, even in a wide photo frame.
export function photoCrop(sceneId, frame, aspectRatio = 1) {
  const [start, end] = [frame * 724, (frame + 1) * 724];
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  // Keep a guard inside each panel edge.
  const panelWidth = end - start - 4;
  const safeHeight = 720;
  const cropWidth = Math.min(panelWidth, safeHeight * ratio);
  const cropHeight = cropWidth / ratio;
  const left = start + 2 + (panelWidth - cropWidth) / 2;
  // Keep the ice-cream cup visible below the child's face in the landscape frame.
  const focusY = sceneId === 'ice-cream-taste' ? 427 : 362;
  const top = Math.max(2, Math.min(722 - cropHeight, focusY - cropHeight / 2));
  return { left, top, width: cropWidth, height: cropHeight };
}

export function photoStyle(sceneId, frame, aspectRatio = 1) {
  const { left, top, width, height } = photoCrop(sceneId, frame, aspectRatio);
  return {
    size: `${2172 / width * 100}% ${724 / height * 100}%`,
    position: `${left / (2172 - width) * 100}% ${top / (724 - height) * 100}%`,
  };
}

export function reduceState(state, action) {
  switch (action.type) {
    case 'open':
      return SCENES.some(scene => scene.id === action.id)
        ? { screen: 'scene', sceneId: action.id, answer: null, phase: 'question' } : state;
    case 'attention':
      return state.screen === 'scene' && state.phase === 'question' && state.answer === null
        ? { ...state, phase: 'attention' } : state;
    case 'answer':
      return state.screen === 'scene' && ['yes', 'no'].includes(action.value)
        ? { ...state, answer: action.value, phase: 'child' } : state;
    case 'parent':
      return state.screen === 'scene' && state.answer
        ? { ...state, phase: 'parent' } : state;
    case 'reset': return { ...state, answer: null, phase: 'question' };
    case 'home': return initialState();
    default: return state;
  }
}

export function presentation(state) {
  const scene = SCENES.find(item => item.id === state.sceneId);
  if (!scene) return null;
  const responseImage = scene[`${state.answer}ResponseImage`] ?? scene.responseImage;
  const responseFrame = scene[`${state.answer}ResponseFrame`];
  const responseDescription = scene[`${state.answer}ResponseDescription`]
    ?? 'ママが慧樹の頭を優しくなで、返事を受け止めています';
  const attention = state.phase === 'attention';
  const replyFrames = state.phase === 'child'
    ? REPLY_PHOTOS[scene.id === 'biima' ? 'biima' : 'common'][state.answer] : null;
  return {
    scene,
    phase: state.phase,
    replyFrames,
    image: replyFrames?.[0] ?? (attention ? ATTENTION_CUE.image : state.phase === 'parent' ? responseImage : scene.image),
    singlePhoto: Boolean(replyFrames) || attention || (state.phase === 'parent' ? !Number.isInteger(responseFrame) : false),
    frame: state.phase === 'parent' && Number.isInteger(responseFrame) ? responseFrame
      : 0,
    caption: attention ? ATTENTION_CUE.text : state.answer === 'yes' ? (scene.yesCaption ?? 'はい、どうぞ') : state.answer === 'no' ? (scene.noCaption ?? 'そっか、わかった') : '',
    responseAudio: attention ? ATTENTION_CUE.audio : state.answer === 'yes' ? (scene.yesResponseAudio ?? 'response-yes') : (scene.noResponseAudio ?? 'response-no'),
    description: attention ? ATTENTION_CUE.description : state.phase === 'parent' ? responseDescription : state.answer === 'yes' ? scene.afterYes : state.answer === 'no' ? scene.afterNo : scene.before,
    reply: state.answer ? `${state.answer === 'yes' ? 'うん' : 'ううん'}、${scene[state.answer]}` : '',
  };
}
