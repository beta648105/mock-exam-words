/* Day 화면 - 단어장 / 암기카드 / 타이핑 테스트 */

const $ = id => document.getElementById(id);

const DAY = qs('day') || '21';

const state = {
  words: [],
  known: new Set(),
  card: { deck: [], idx: 0, dir: 'en2ko', onlyUnknown: false, animating: false },
  quiz: {
    queue: [], idx: 0, correct: 0, wrong: [], reverse: false, answered: false, timer: null
  }
};

/* ============ 초기화 ============ */

(async function init() {
  try {
    const { info, words } = await loadDay(DAY);
    state.words = words;
    state.known = getKnown(DAY);

    document.title = (info.title || 'Day ' + DAY) + ' · 모고학습앱';
    $('dayTitle').textContent = info.title || 'Day ' + DAY;
    $('daySub').textContent = words.length + '단어';
    $('app').hidden = false;

    bindTabs();
    bindList();
    bindCard();
    bindQuiz();

    renderList();
    buildDeck();
    renderQuizIntro();
  } catch (e) {
    $('msg').hidden = false;
    $('msg').textContent = e.message;
    $('daySub').textContent = '오류';
  }
})();

/* ============ 탭 ============ */

function bindTabs() {
  const tabs = [
    [$('tabList'), $('panelList')],
    [$('tabCard'), $('panelCard')],
    [$('tabQuiz'), $('panelQuiz')]
  ];
  tabs.forEach(([btn, panel]) => {
    btn.addEventListener('click', () => {
      tabs.forEach(([b, p]) => {
        const on = b === btn;
        b.setAttribute('aria-selected', String(on));
        p.hidden = !on;
      });
      if (panel === $('panelCard')) { buildDeck(); }
      if (panel === $('panelQuiz')) { renderQuizIntro(); }
    });
  });
}

/* ============ 단어장 ============ */

function bindList() {
  $('blurMeaning').addEventListener('change', e => {
    $('wordList').classList.toggle('hide-meaning', e.target.checked);
  });

  $('resetKnown').addEventListener('click', () => {
    if (!confirm('이 Day 의 "외움" 표시를 모두 지울까요?')) return;
    state.known.clear();
    setKnown(DAY, state.known);
    renderList();
    buildDeck();
  });
}

function toggleKnown(num) {
  if (state.known.has(num)) state.known.delete(num);
  else state.known.add(num);
  setKnown(DAY, state.known);
  renderKnownMeta();
}

function renderKnownMeta() {
  const total = state.words.length;
  const n = state.words.filter(w => state.known.has(w.number)).length;
  $('knownChip').textContent = '외움 ' + n + ' / ' + total;
  $('knownBar').style.width = (total ? n / total * 100 : 0) + '%';
}

function renderList() {
  const box = $('wordList');
  box.innerHTML = '';

  state.words.forEach(w => {
    const known = state.known.has(w.number);
    const row = document.createElement('div');
    row.className = 'item' + (known ? ' known' : '');
    row.innerHTML =
      '<span class="no">' + escapeHTML(w.number) + '</span>' +
      '<span class="txt">' +
        '<div class="w">' + escapeHTML(w.word) + '</div>' +
        '<div class="m">' + escapeHTML(w.meaning_raw) + '</div>' +
      '</span>' +
      '<button class="star" aria-pressed="' + known + '" aria-label="외움 표시">★</button>';

    row.querySelector('.star').addEventListener('click', () => {
      toggleKnown(w.number);
      const on = state.known.has(w.number);
      row.classList.toggle('known', on);
      row.querySelector('.star').setAttribute('aria-pressed', String(on));
    });

    box.appendChild(row);
  });

  renderKnownMeta();
}

/* ============ 암기 카드 ============ */

function bindCard() {
  $('card').addEventListener('click', flipCard);

  $('prevBtn').addEventListener('click', () => moveCard(-1));
  $('nextBtn').addEventListener('click', () => moveCard(1));

  $('shuffleBtn').addEventListener('click', () => {
    state.card.deck = shuffle(state.card.deck);
    state.card.idx = 0;
    renderCard();
  });

  $('dirBtn').addEventListener('click', () => {
    state.card.dir = state.card.dir === 'en2ko' ? 'ko2en' : 'en2ko';
    $('dirBtn').textContent = state.card.dir === 'en2ko' ? '영어 → 뜻' : '뜻 → 영어';
    renderCard();
  });

  $('onlyUnknown').addEventListener('change', e => {
    state.card.onlyUnknown = e.target.checked;
    buildDeck();
  });

  $('knownBtn').addEventListener('click', markKnownAndNext);

  document.addEventListener('keydown', e => {
    if ($('panelCard').hidden) return;
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); moveCard(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); moveCard(1); }
    else if (e.key === ' ') { e.preventDefault(); flipCard(); }
    else if (e.key === 'Enter') { e.preventDefault(); markKnownAndNext(); }
  });
}

function buildDeck() {
  const src = state.card.onlyUnknown
    ? state.words.filter(w => !state.known.has(w.number))
    : state.words;
  state.card.deck = src;
  state.card.idx = 0;
  renderCard();
}

function flipCard() {
  $('card').classList.toggle('flipped');
}

/* 뒤집힌 카드를 앞면으로 되돌린다. 회전이 보이면 슬라이드와 겹쳐 지저분하므로
   전환을 잠깐 꺼서 즉시 되돌린다. */
function resetFlip() {
  const card = $('card');
  if (!card.classList.contains('flipped')) return;
  card.classList.add('nofx');
  card.classList.remove('flipped');
  void card.offsetWidth;
  card.classList.remove('nofx');
}

const REDUCED_MOTION = window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* step > 0(다음): 현재 카드는 왼쪽으로 빠지고 새 카드가 오른쪽에서 들어온다.
   step < 0(이전): 반대 방향. */
function moveCard(step) {
  const deck = state.card.deck;
  if (!deck.length || state.card.animating) return;

  const advance = () => {
    state.card.idx = (state.card.idx + step + deck.length) % deck.length;
    renderCard();
  };

  const slide = $('cardSlide');
  if (!slide || REDUCED_MOTION) { advance(); return; }

  const leaving = step > 0 ? 'leave-left' : 'leave-right';
  const entering = step > 0 ? 'enter-right' : 'enter-left';

  state.card.animating = true;
  slide.classList.add(leaving);

  setTimeout(() => {
    slide.classList.remove(leaving);
    advance();

    // 반대편에 애니메이션 없이 세워둔 뒤, 클래스를 빼서 제자리로 밀어 넣는다.
    slide.classList.add(entering);
    void slide.offsetWidth;            // 강제 리플로우로 위치를 확정
    slide.classList.remove(entering);

    state.card.animating = false;
  }, 200);
}

function markKnownAndNext() {
  const w = state.card.deck[state.card.idx];
  if (!w) return;
  state.known.add(w.number);
  setKnown(DAY, state.known);
  renderList();
  if (state.card.onlyUnknown) buildDeck();
  else moveCard(1);
}

function renderCard() {
  const { deck, idx, dir } = state.card;
  resetFlip();

  if (!deck.length) {
    $('cardFront').textContent = '🎉';
    $('cardBack').textContent = '모두 외웠어요!';
    $('cardBackSub').textContent = '';
    $('cardCounter').textContent = '카드 없음';
    return;
  }

  const w = deck[idx];
  const front = dir === 'en2ko' ? w.word : w.meaning_raw;
  const back = dir === 'en2ko' ? w.meaning_raw : w.word;

  $('cardFront').textContent = front;
  $('cardBack').textContent = back;
  $('cardBackSub').textContent = '#' + w.number;
  $('cardCounter').textContent =
    (idx + 1) + ' / ' + deck.length +
    (state.known.has(w.number) ? ' · 외움 ★' : '');
}

/* ============ 타이핑 테스트 ============ */

function bindQuiz() {
  $('startBtn').addEventListener('click', () => startQuiz(state.words));

  $('startWrongBtn').addEventListener('click', () => {
    const nums = new Set(getWrong(DAY));
    startQuiz(state.words.filter(w => nums.has(w.number)));
  });

  $('qSubmit').addEventListener('click', submitOrNext);
  $('qSkip').addEventListener('click', () => { if (!state.quiz.answered) grade(''); });
  $('qQuit').addEventListener('click', () => {
    clearTimeout(state.quiz.timer);
    showQuizScreen('intro');
  });

  // 한글 IME 에서 Enter 한 번으로 제출되도록 keyup 에서 처리
  $('qInput').addEventListener('keyup', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitOrNext(); }
  });

  $('rRetryAll').addEventListener('click', () => startQuiz(state.words));
  $('rRetryWrong').addEventListener('click', () => {
    const nums = new Set(getWrong(DAY));
    const list = state.words.filter(w => nums.has(w.number));
    if (list.length) startQuiz(list);
  });
}

function renderQuizIntro() {
  $('introCount').textContent = state.words.length;
  const wrong = getWrong(DAY);
  const btn = $('startWrongBtn');
  btn.hidden = wrong.length === 0;
  btn.textContent = '지난 오답만 (' + wrong.length + ')';
  showQuizScreen('intro');
}

function showQuizScreen(which) {
  $('quizIntro').hidden = which !== 'intro';
  $('quizPlay').hidden = which !== 'play';
  $('quizResult').hidden = which !== 'result';
}

function startQuiz(list) {
  if (!list.length) return;
  const q = state.quiz;
  clearTimeout(q.timer);
  q.queue = $('quizShuffle').checked ? shuffle(list) : list.slice();
  q.idx = 0;
  q.correct = 0;
  q.wrong = [];
  q.answered = false;
  q.reverse = $('quizReverse').checked;

  showQuizScreen('play');
  renderQuestion();
}

function renderQuestion() {
  const q = state.quiz;
  const w = q.queue[q.idx];

  $('qLabel').textContent = q.reverse ? '영어 단어를 입력하세요' : '뜻을 입력하세요';
  $('qWord').textContent = q.reverse ? w.meaning_raw : w.word;
  $('qProgress').textContent = (q.idx + 1) + ' / ' + q.queue.length;
  $('qScore').textContent = '정답 ' + q.correct;
  $('qBar').style.width = (q.idx / q.queue.length * 100) + '%';

  const input = $('qInput');
  input.value = '';
  input.disabled = false;
  input.className = 'answer';
  input.setAttribute('lang', q.reverse ? 'en' : 'ko');
  input.focus();

  $('qFeedback').textContent = '';
  $('qFeedback').className = 'feedback';
  $('qSubmit').textContent = '확인';
  $('qSkip').disabled = false;
  q.answered = false;
}

function submitOrNext() {
  const q = state.quiz;
  if (q.answered) { clearTimeout(q.timer); nextQuestion(); return; }
  // 빈 칸은 채점하지 않음 (오답 후 Enter 가 다음 문제까지 넘어가는 것 방지)
  if (!$('qInput').value.trim()) return;
  grade($('qInput').value);
}

function grade(value) {
  const q = state.quiz;
  const w = q.queue[q.idx];
  const input = $('qInput');
  const fb = $('qFeedback');

  const ok = q.reverse
    ? normalize(value) === normalize(w.word)
    : isCorrect(value, w);

  q.answered = true;
  input.disabled = true;
  $('qSkip').disabled = true;

  if (ok) {
    q.correct++;
    input.classList.add('ok');
    fb.className = 'feedback ok';
    fb.textContent = '정답! 🎉';
    $('qScore').textContent = '정답 ' + q.correct;
    q.timer = setTimeout(nextQuestion, 650);
  } else {
    q.wrong.push({ word: w, typed: value.trim() });
    input.classList.add('bad');
    fb.className = 'feedback bad';
    fb.innerHTML = '오답 · 정답은' +
      '<span class="correct-answer">' +
      escapeHTML(q.reverse ? w.word : w.meaning_raw) + '</span>';
    $('qSubmit').textContent = '다음 →';
    $('qSubmit').focus();
  }
}

function nextQuestion() {
  const q = state.quiz;
  q.idx++;
  if (q.idx >= q.queue.length) finishQuiz();
  else renderQuestion();
}

function finishQuiz() {
  const q = state.quiz;
  const total = q.queue.length;
  const pct = Math.round(q.correct / total * 100);

  setScore(DAY, q.correct, total);
  setWrong(DAY, q.wrong.map(x => x.word.number));

  // 다 맞힌 단어는 '외움' 으로 표시
  const wrongNums = new Set(q.wrong.map(x => x.word.number));
  q.queue.forEach(w => { if (!wrongNums.has(w.number)) state.known.add(w.number); });
  setKnown(DAY, state.known);
  renderList();

  $('rScore').textContent = pct;
  $('rDetail').textContent = total + '문제 중 ' + q.correct + '개 정답';

  const box = $('rWrongBox');
  const list = $('rWrongList');
  list.innerHTML = '';
  box.hidden = q.wrong.length === 0;

  q.wrong.forEach(({ word, typed }) => {
    const row = document.createElement('div');
    row.className = 'wrongrow';
    row.innerHTML =
      '<b>' + escapeHTML(word.word) + '</b>' +
      '<span>' + escapeHTML(word.meaning_raw) +
      (typed ? ' <span class="typed">' + escapeHTML(typed) + '</span>' : '') +
      '</span>';
    list.appendChild(row);
  });

  $('rRetryWrong').disabled = q.wrong.length === 0;
  showQuizScreen('result');
}
