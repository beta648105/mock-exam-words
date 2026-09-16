/* 공통 유틸 - 데이터 로딩, 저장소, 채점 정규화 */

const DATA_DIR = 'data/';
// 단어 목록이 바뀌면 번호가 다른 단어를 가리키게 되므로,
// 이 값을 올려서 예전 진도(외움/점수/오답)를 버린다.
const STORE_PREFIX = 'vocab:v2:';

/* ---------- fetch ---------- */

async function getJSON(path) {
  let res;
  try {
    res = await fetch(path, { cache: 'no-cache' });
  } catch (e) {
    throw new Error(
      'file:// 로 직접 열면 데이터를 못 읽어요. GitHub Pages 에 올리거나 ' +
      '폴더에서 `python -m http.server` 실행 후 localhost 로 접속해 주세요.'
    );
  }
  if (!res.ok) throw new Error(path + ' 를 찾을 수 없어요 (HTTP ' + res.status + ')');
  return res.json();
}

function loadDays() {
  return getJSON(DATA_DIR + 'days.json');
}

async function loadDay(day) {
  const days = await loadDays();
  const info = days.find(d => String(d.day) === String(day));
  if (!info) throw new Error('Day ' + day + ' 는 days.json 에 등록되어 있지 않아요.');
  const words = await getJSON(DATA_DIR + info.file);
  return { info, words };
}

/* ---------- storage ---------- */

function storeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function storeSet(key, value) {
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    /* 저장 불가(시크릿 모드 등)여도 앱은 그대로 동작 */
  }
}

/* 외운 단어 번호 집합 */
function getKnown(day) {
  return new Set(storeGet('known:' + day, []));
}

function setKnown(day, set) {
  storeSet('known:' + day, [...set]);
}

/* 최근 테스트 점수 { correct, total, at } */
function getScore(day) {
  return storeGet('score:' + day, null);
}

function setScore(day, correct, total) {
  storeSet('score:' + day, { correct, total, at: Date.now() });
}

/* 마지막 오답 단어 번호 */
function getWrong(day) {
  return storeGet('wrong:' + day, []);
}

function setWrong(day, numbers) {
  storeSet('wrong:' + day, numbers);
}

/* ---------- 채점 ---------- */

/* 비교용 정규화: 공백/문장부호/물결표 제거 */
function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\s~\-_.,·、:;()[\]{}'"!?/\\]/g, '')
    .trim();
}

/* 입력한 뜻이 정답인지 판정 */
function isCorrect(input, word) {
  const typed = normalize(input);
  if (!typed) return false;

  const answers = (word.meaning_answers && word.meaning_answers.length)
    ? word.meaning_answers
    : String(word.meaning_raw || '').split(',');

  // 개별 뜻 중 하나와 일치하면 정답
  if (answers.some(a => normalize(a) === typed)) return true;
  // "사로잡힌, 얽매인" 처럼 전체를 다 적은 경우도 정답
  if (normalize(word.meaning_raw) === typed) return true;
  if (normalize(answers.join('')) === typed) return true;

  return false;
}

/* ---------- 기타 ---------- */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

/* ---------- 홈 화면 앱(standalone) 대응 ---------- */

/* iOS 홈 화면 앱에서는 <a> 클릭이 사파리 창으로 튀어나가는 버전이 있다.
   같은 사이트 안의 이동은 JS 로 직접 처리해서 앱 안에 머물게 한다. */
if (window.navigator.standalone === true) {
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;

    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;

    e.preventDefault();
    location.href = url.href;
  });
}
