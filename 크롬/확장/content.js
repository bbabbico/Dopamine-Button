const CLICKABLE_SELECTORS = 'a[href], button, [role="button"], input[type="submit"], input[type="button"], [aria-haspopup="menu"]';
const INPUT_SELECTORS = 'input[type="text"], input[type="search"], input[type="email"], textarea';
const SELECT_SELECTORS = 'select';
const INPUT_TEST_PHRASES = [
  '지금 흘린 땀방울이 A+로 돌아올 거야. 화이팅!',
  '교수님도 너의 기발한 답안지를 애타게 기다리고 계셔.',
  '밤샘의 요정이 널 돕고 있어. 조금만 더 버티자!',
  '이번 학기 성적 장학금의 주인공은 바로 너!',
  '오늘만 버티면 내일은 자유의 몸이다! 종강이 코앞이야.',
  '커피 한 잔의 기적과 너의 찍기 실력을 믿어보자.',
  '시험지 위에서 너의 숨겨진 진가를 마음껏 펼치고 와.',
  '할 수 있다! 헷갈려서 찍은 두 문제 모두 정답일지어다!',
  '눈 꾹 감고 딱 한 페이지만 더 보자. 그게 내일 시험에 나온다.',
  '고생한 만큼 분명히 좋은 결과가 있을 거야. 너 자신을 믿어!',
  '폰 그만 보고 책 펴라. 네 학점이 바닥에서 울고 있다.',
  '지금 자면 꿈을 꾸지만, 지금 공부하면 꿈을 이룬다. (어디서 많이 들어봤지?)',
  '내일의 너에게 미루지 마. 내일의 너는 오늘보다 더 피곤할 예정이니까.',
  '재수강할 돈으로 맛있는 걸 사 먹자. 이번에 무조건 끝내.',
  '교수님은 다 알고 계신다. 네가 중간고사 때 무슨 짓을 했는지.',
  '유튜브 알고리즘이 네 인생을 책임져주지 않아. 창 닫아라.',
  '그 학점 들고 취업 시장 나갈 수 있겠어? 당장 펜 들어!',
  '벼락치기도 평소에 머리를 써둔 애들이나 통하는 거다. 넌 어때?',
  '등록금이 얼만데 지금 침대와 물아일체가 되어 있니.',
  '지금 네 경쟁자는 세 번째 복습을 마치고 기출문제를 풀고 있다.',
  '진짜 누른다고?',
  '선문대 아기사자들, 코딩하다 밤새지 말고 전공 공부부터 챙겨!',
  '멋사 해커톤 밤샘보다 기말고사 전날 밤샘이 더 짜릿하지 않아?',
  'Spring Boot 에러 잡는 것보다 전공 서적 1회독이 훨씬 쉽단다.',
  '백엔드 서버는 멀쩡한데 왜 내 멘탈 서버가 터지고 난리일까.',
  '내 학점에도 Git 롤백 기능이 있었으면 좋겠다. 리셋 시급함.',
  '인생도 Go 언어처럼 깔끔하게 컴파일돼서 쫙쫙 실행되면 얼마나 좋을까.',
  '500 Internal Server Error: 현재 뇌 용량이 초과되어 더 이상 암기할 수 없습니다.',
  '잔디(Commit)는 그렇게 열심히 심으면서 시험공부는 왜 푸시(Push)를 안 하니.',
  '사자처럼 포효하며 시험지를 갈기갈기 찢어버려! (진짜 찢으면 F)',
  '아 배고프다. 시험 끝나면 당장 마라탕에 꿔바로우 시킨다.',
  '치킨은 살 안 쪄요. 살은 내가 찌지.',
  '이 빈칸에 뭘 적을지 몰라서 그냥 아무 말이나 적어보는 중.',
  '아이스 아메리카노 3잔째. 내 심장이 뛰는 건지 카페인이 뛰는 건지.',
  '집에 가고 싶다. 이미 집이지만 격렬하게 집에 가고 싶다.',
  '이 확장프로그램 키보드 자동완성 타건감이 꽤 괜찮은데?',
  '오늘 야식 메뉴 추천 좀 해주세요. (진지함)',
  '로또 1등 당첨되게 해주세요. 그럼 자퇴서 낼 텐데.',
  '확장프로그램 정상 작동 테스트 중... 삐리빅... 치익...',
  '고양이는 세상을 구한다. 멍멍! (어라?)',
  '내가 왜 이 칸을 클릭했더라? 기억이 안 나네.',
  '아무 생각도 안 하고 싶다. 이미 아무 생각도 안 하고 있지만.',
  '내일은 내일의 태양이 뜬다. 비 오면 말고.',
  '붕어빵에는 왜 붕어가 없을까. 그럼 내 성적표엔 왜 A가 없을까.',
  '숨 쉬기 귀찮아도 숨은 쉬어야지. 시험 보기 싫어도 봐야 하는 것처럼.',
  '마우스 좌클릭하기 정확히 1초 전.',
  '민트초코는 세상을 지배한다. 반박 시 당신 말이 다 틀림.',
  '이 글을 우연히 보게 된 당신, 오늘 하루도 정말 수고 많았어요.',
  '앗, 야생의 빈칸이 나타났다! 아무 말 공격!',
  '돌아가라...'
];

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'START_LOCAL_SCAN') {
    runLocalBurst(message.payload?.burstCount ?? 8);
  }

  if (message.action === 'APPLY_SERVER_ACTIONS') {
    applyServerActions(message.payload?.executedActions || []);
  }
});

function isVisible(el) {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function getVisible(selector) {
  return Array.from(document.querySelectorAll(selector)).filter(isVisible);
}

function randomPick(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function markElement(target, color) {
  const old = target.style.outline;
  target.style.outline = `3px solid ${color}`;
  target.style.outlineOffset = '2px';
  setTimeout(() => {
    target.style.outline = old;
  }, 260);
}

function clickRandom() {
  const target = randomPick(getVisible(CLICKABLE_SELECTORS));
  if (!target) return;

  if (target.tagName.toLowerCase() === 'a') {
    target.setAttribute('target', '_blank');
  }

  markElement(target, '#ef4444');
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function fillRandomInput() {
  const target = randomPick(getVisible(INPUT_SELECTORS));
  if (!target) return;

  markElement(target, '#f59e0b');
  const value = randomPick(INPUT_TEST_PHRASES) || 'lion_fallback';
  target.focus();
  target.value = value;
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
}

function chooseRandomOption() {
  const target = randomPick(getVisible(SELECT_SELECTORS));
  if (!target || !target.options.length) return;

  const pick = Math.floor(Math.random() * target.options.length);
  markElement(target, '#8b5cf6');
  target.selectedIndex = pick;
  target.dispatchEvent(new Event('change', { bubbles: true }));
}

function runLocalBurst(count) {
  const actionFns = [clickRandom, fillRandomInput, chooseRandomOption];

  for (let i = 0; i < count; i += 1) {
    const fn = actionFns[i % actionFns.length];
    setTimeout(() => {
      try {
        fn();
      } catch (error) {
        console.info('[Lion] local action skip', error?.message || error);
      }
    }, i * 180);
  }
}

function applyServerActions(actions) {
  if (!actions.length) {
    console.info('[Lion] 서버 액션이 없습니다.');
    return;
  }

  actions.forEach((action, index) => {
    setTimeout(() => {
      try {
        if (action.type === 'navigate' && action.url) {
          window.open(action.url, '_blank', 'noopener,noreferrer');
          return;
        }

        if (!action.selector) return;
        const el = document.querySelector(action.selector);
        if (!el) return;

        if (action.type === 'click') {
          if (el.tagName.toLowerCase() === 'a') {
            el.setAttribute('target', '_blank');
          }
          markElement(el, '#2563eb');
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }

        if (action.type === 'fill' && typeof action.value === 'string') {
          markElement(el, '#22c55e');
          el.focus();
          el.value = action.value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch (error) {
        console.info('[Lion] server action skip', error?.message || error);
      }
    }, index * 240);
  });
}
