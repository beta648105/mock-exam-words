# 모고학습앱

모의고사 기출 단어를 워드마스터처럼 지문 번호 단위로 외우는 웹앱. 빌드 도구 없이 정적 파일만 사용하므로 GitHub Pages 에 그대로 올리면 된다.

👉 **https://beta648105.github.io/mock-exam-words/**

## 홈 화면에 앱으로 설치하기

**아이폰(사파리)** — 사이트 접속 → 공유 버튼 → `홈 화면에 추가` → 추가.
홈 화면 아이콘으로 열면 주소창과 하단 툴바 없이 전체화면으로 실행된다.

**안드로이드(크롬)** — 우측 상단 ⋮ → `홈 화면에 추가` / `앱 설치`.

## 기능

- **단어장** — 번호 / 단어 / 뜻 목록, 뜻 가리기, 단어별 "외움 ★" 표시
- **암기** — 플래시카드(탭 또는 Space 로 뒤집기), 영어→뜻 / 뜻→영어, 섞기, 못 외운 것만 보기
- **테스트** — 단어를 보고 뜻을 타이핑해서 맞히기. 정답이면 바로 다음 문제로,
  틀리면 정답을 3 초 보여준 뒤 자동으로 넘어가고 그 단어는 "못 외움" 으로 되돌린다.
  끝나면 점수·오답 목록·"오답만 다시" 제공

진행 상황(외운 단어, 최근 점수, 오답)은 브라우저 localStorage 에 지문별로 저장된다.

## 폴더 구조

```
index.html            지문 목록
day.html              지문 학습 화면 (day.html?day=21)
manifest.webmanifest  앱 이름 · 아이콘 · 전체화면 설정
assets/style.css
assets/common.js      데이터 로딩 · 저장소 · 채점 규칙
assets/day.js         단어장 / 암기 / 테스트 로직
data/days.json        지문 목록 정의
data/21_words.json    21번 지문 단어
icons/                앱 아이콘 (PNG)
```

## 아이콘 다시 만들기

아이콘은 Pillow 스크립트로 생성했다. 디자인을 바꾸려면 `tools/make_icons.py` 의
색상·글자를 수정하고 다시 실행하면 `icons/` 안의 PNG 가 전부 갱신된다.

```powershell
pip install pillow
python tools/make_icons.py
```

## 지문 추가하는 법

1. `data/` 에 `22_words.json` 이나 `SR1_words.json` 같은 파일을 넣는다. 형식은 동일:

   ```json
   [
     { "number": 1, "word": "captive", "meaning_raw": "사로잡힌, 얽매인",
       "meaning_answers": ["사로잡힌", "얽매인"] }
   ]
   ```

   - `number` — 지문 안에서의 순번. **지문마다 1 번부터 다시 시작한다.**
   - `meaning_raw` — 화면에 보여줄 전체 뜻
   - `meaning_answers` — 테스트에서 정답으로 인정할 뜻들. 이 중 **하나만** 맞게 입력해도 정답 처리된다.

2. `data/days.json` 에 한 줄 추가:

   ```json
   { "day": "22", "title": "22", "file": "22_words.json" }
   ```

그러면 첫 화면에 22 카드가 자동으로 생긴다.

### 이름 규칙

`day` 는 지문을 구분하는 값이고 숫자일 필요가 없다. 모고 지문은 번호를
(`"20"`, `"41"`), 교과서 추가지문은 이름을 그대로 쓴다 (`"SR1"`, `"FTTT1-1"`).
파일 이름도 같은 값을 쓴다 (`SR1_words.json`).

`title` 은 카드에 보이는 글자다. 보통 `day` 와 같게 둔다.

**첫 화면에 나오는 순서는 `days.json` 에 적힌 순서 그대로다.** 지금은 교과서
추가지문(SR1, FTTT1-1~3)을 위에 두고, 그 아래 모고 지문을 번호순으로 적어 두었다.

`day` 값은 진행 상황을 저장하는 열쇠로도 쓰인다. 이미 공부한 지문의 `day` 를
바꾸면 그 지문의 외움 표시와 점수가 사라지니 나중에 바꾸지 않는 게 좋다.

## 채점 규칙

입력값과 정답을 비교할 때 공백, 쉼표, 마침표, 물결표(~), 괄호 등은 무시한다.
예를 들어 `captive` 는 `사로잡힌`, `얽매인`, `사로잡힌, 얽매인` 모두 정답이다.

## 로컬에서 확인하기

`file://` 로 HTML 을 직접 열면 브라우저 보안 정책 때문에 JSON 을 못 읽는다. 폴더에서 아래를 실행하고 http://localhost:8000 으로 접속한다.

```powershell
python -m http.server 8000
```

## GitHub Pages 배포

```powershell
git init
git add .
git commit -m "모고학습앱 첫 커밋"
git branch -M main
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```

저장소 **Settings → Pages → Source: Deploy from a branch → main / (root)** 로 설정하면
`https://<계정>.github.io/<저장소>/` 에서 열린다.
