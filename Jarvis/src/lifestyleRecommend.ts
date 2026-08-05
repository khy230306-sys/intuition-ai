/**
 * Lifestyle recommendations (food, travel, movies, …) — separate from stock picks.
 * Opens Maps / Search when useful; never invents fake live rankings.
 */

export type LifestyleKind =
  | "music"
  | "food"
  | "cafe"
  | "travel_kr"
  | "travel_world"
  | "movie"
  | "book"
  | "gift"
  | "workout"
  | "date"
  | "study"
  | "fashion"
  | "hotel";

export type LifestyleReply = {
  kind: LifestyleKind;
  text: string;
  /** Maps query (optional). */
  mapsQuery?: string;
  /** Web search query (optional). */
  searchQuery?: string;
  /** Prefer YouTube / music open. */
  youtubeQuery?: string;
};

function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Soft ask for a pick / place / idea (not necessarily the word 추천). */
export function wantsLifestyleHelp(raw: string): boolean {
  const t = norm(raw);
  if (!t) return false;
  return /추천|골라\s*줘|골라줘|알려\s*줘|알려줘|찾아\s*줘|찾아줘|좋을까|좋을지|어디\s*가|어디가|어디\s*좋|뭐\s*듣|뭐듣|뭐\s*먹|뭐먹|어디\s*먹|뭐\s*볼|뭐볼|플레이리스트|playlist|recommend|suggest|where\s+should|what\s+should/.test(
    t,
  );
}

const TOPIC_RULES: Array<{ kind: LifestyleKind; re: RegExp }> = [
  {
    kind: "music",
    re: /음악|노래|뮤직|플레이리스트|playlist|가요|랩|힙합|발라드|jazz|재즈|클래식|pop\b|케이팝|k[\s-]?pop|노래방|듣고\s*싶|들을\s*만|신나는\s*곡|잔잔한\s*곡|드라이브\s*음악|공부\s*음악|수면\s*음악|music\b|song|songs/,
  },
  {
    kind: "food",
    re: /맛집|맛있는\s*집|밥집|식당|음식점|먹을\s*곳|먹을곳|뭐\s*먹|뭐먹|저녁\s*뭐|점심\s*뭐|브런치|야식|술집|고기집|해장|분식|중식|일식|한식|치킨|피자|햄버거|ramen|라멘|restaurant|food\b/,
  },
  {
    kind: "cafe",
    re: /카페|커피|디저트|베이커리|cafe|coffee/,
  },
  {
    kind: "travel_kr",
    re: /국내\s*여행|국내여행|국내\s*관광|국내\s*휴가|한국\s*여행|제주|부산\s*여행|강릉|여수|경주|전주|속초|양양|가평|남해|통영|울릉|국내\s*어디|국내\s*갈|주말\s*여행|당일치기|호캉스/,
  },
  {
    kind: "travel_world",
    re: /해외\s*여행|해외여행|해외\s*어디|배낭|유럽\s*여행|일본\s*여행|동남아|태국|베트남|발리|괌|사이판|하와이|여행지|관광지|휴가\s*어디|여행\s*추천|여행은\s*어디|여행\s*어디|travel|vacation|trip\b/,
  },
  {
    kind: "hotel",
    re: /호텔|숙소|리조트|펜션|글램핑|에어비앤비|airbnb|hotel/,
  },
  {
    kind: "movie",
    re: /영화|드라마|넷플릭스|ott|시리즈|애니|애니메|볼\s*만한|뭐\s*볼|movie|drama|netflix/,
  },
  {
    kind: "book",
    re: /책\b|독서|소설|에세이|읽을\s*만|북\s*추천|book\b|novel/,
  },
  {
    kind: "gift",
    re: /선물|기념일|생일\s*선물|gift/,
  },
  {
    kind: "workout",
    re: /운동|헬스|홈트|다이어트|요가|필라테스|러닝|workout|exercise/,
  },
  {
    kind: "date",
    re: /데이트|소개팅|연인|커플\s*코스|date\s*idea/,
  },
  {
    kind: "study",
    re: /공부\s*방법|학습|자격증|토익|공부\s*루틴|집중\s*팁|study\s*tip/,
  },
  {
    kind: "fashion",
    re: /패션|코디|옷\s*추천|옷차림|스타일링|fashion|outfit/,
  },
];

export function detectLifestyleRecommend(raw: string): LifestyleKind | null {
  const t = norm(raw);
  if (!t || !wantsLifestyleHelp(t)) return null;

  // Stock / invest language → leave for invest handler (even if 추천).
  if (
    /주식|종목|코인|비트|이더|환율|달러|엔화|금값|시황|매수|매도|포트폴리오|etf|nasdaq|kospi|kosdaq|투자\s*종목|투자\s*추천|stock|crypto|bitcoin/.test(
      t,
    )
  ) {
    return null;
  }

  for (const rule of TOPIC_RULES) {
    if (rule.re.test(t)) return rule.kind;
  }

  // "국내 … 좋을까" without the word 여행
  if (/국내/.test(t) && /여행|관광|휴가|어디|갈|추천/.test(t)) return "travel_kr";

  return null;
}

function foodIdeas(t: string): string[] {
  if (/야식|밤|深夜/.test(t)) return ["곱창 / 막창", "치킨 + 맥주", "분식(떡볶이·김밥)", "편의점 간단 세트"];
  if (/점심|런치/.test(t)) return ["비빔밥·덮밥", "국밥·면", "샌드위치·샐러드", "가볍게 김밥"];
  if (/데이트|분위기/.test(t)) return ["파스타·스테이크", "오마카세·스시", "와인바·이탈리안", "한정식"];
  return ["한식 집밥 스타일", "고깃집", "면·국물", "분식 / 치킨", "브런치 카페"];
}

function travelKrIdeas(t: string): string[] {
  if (/제주/.test(t)) return ["제주 동쪽(성산·우도)", "애월·한림 카페로드", "서귀포 올레길"];
  if (/부산/.test(t)) return ["해운대·광안리", "영도·흰여울", "감천문화마을 + 자갈치"];
  if (/강릉|속초|양양|동해/.test(t)) return ["강릉 안목·주문진", "속초 설악·중앙시장", "양양 서피비치"];
  if (/주말|당일/.test(t)) return ["가평·양평 (근교)", "수원·화성 / 전주 한옥", "인천 차이나타운·월미"];
  return ["제주 (섬 휴식)", "부산 (바다+먹거리)", "강릉·속초 (동해)", "여수·남해 (남해안)", "경주 (역사+여유)"];
}

function travelWorldIdeas(t: string): string[] {
  if (/일본|도쿄|오사카/.test(t)) return ["도쿄 (쇼핑·미식)", "오사카·교토 (먹거리+고도)", "후쿠오카 (근거리)"];
  if (/유럽/.test(t)) return ["파리·리옹", "로마·피렌체", "바르셀로나"];
  if (/동남아|태국|베트남|발리/.test(t)) return ["방콕·치앙마이", "다낭·호이안", "발리·나트랑"];
  return ["일본 (가까움+먹거리)", "동남아 (가성비 휴가)", "유럽 (문화·도시)", "괌·사이판 (휴양)"];
}

export function buildLifestyleReply(raw: string, kind: LifestyleKind): LifestyleReply {
  const t = norm(raw);

  switch (kind) {
    case "music": {
      const q = /잔잔|힐링|수면|공부/.test(t)
        ? "lofi chill study music"
        : /신나|운동|런닝|드라이브/.test(t)
          ? "upbeat kpop playlist"
          : /재즈|jazz/.test(t)
            ? "jazz playlist"
            : "좋은 노래 추천 플레이리스트";
      return {
        kind,
        text:
          "음악은 취향이 갈려서, 바로 들을 수 있게 검색을 열어둘게요.\n" +
          "분위기만 말해도 돼요 — 예: 「잔잔한 노래」, 「운동할 때 들을 플리」, 「케이팝 추천」.",
        youtubeQuery: q,
        searchQuery: `${q} youtube`,
      };
    }
    case "food": {
      const ideas = foodIdeas(t);
      const area = (
        t.match(
          /(?:서울|부산|대구|인천|광주|대전|울산|제주|강남|홍대|이태원|성수|해운대|광안|전주|수원|지리산|설악|한라|남산|경주|여수|강릉|속초|양양|전주|수원|망미|광안리)[^\s]{0,8}/,
        )?.[0] || ""
      ).trim();
      const mapsQ = area ? `${area} 맛집` : "근처 맛집";
      return {
        kind,
        text: area
          ? `「${area}」맛집을 지도·검색으로 바로 찾아볼게요.\n` +
            `메뉴 감만 잡아두면 좋아요:\n${ideas.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n` +
            `「${area} 한식 맛집」처럼 더 좁혀도 됩니다.`
          : `먹을 곳 방향이에요:\n${ideas.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n` +
            "지도에서 근처 맛집을 열어둘게요. 동네·산·역 이름을 붙이면 더 정확해집니다.",
        mapsQuery: mapsQ,
        searchQuery: area ? `${area} 맛집 추천` : "오늘 뭐 먹지 맛집",
      };
    }
    case "cafe":
      return {
        kind,
        text: "카페는 분위기·커피·디저트 중 뭐가 우선인지에 따라 갈려요. 근처 카페 검색을 열어둘게요.",
        mapsQuery: "근처 카페",
        searchQuery: "분위기 좋은 카페 추천",
      };
    case "travel_kr": {
      const ideas = travelKrIdeas(t);
      return {
        kind,
        text:
          `국내 여행지 후보:\n${ideas.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n` +
          "일정(당일/1박)·취향(바다/산/먹거리) 말하면 더 좁혀줄게요.",
        searchQuery: /제주/.test(t) ? "제주 여행 코스" : "국내 여행지 추천",
      };
    }
    case "travel_world": {
      const ideas = travelWorldIdeas(t);
      return {
        kind,
        text:
          `여행지 후보:\n${ideas.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n` +
          "예산·기간·비자 여유 있으면 더 맞춰볼게요.",
        searchQuery: "해외 여행지 추천",
      };
    }
    case "hotel":
      return {
        kind,
        text: "숙소는 위치·예산·조식 여부가 핵심이에요. 지역을 말해 주면 검색을 맞춰 열게요.",
        searchQuery: /제주|부산|서울|강릉|여수/.test(t) ? `${t.slice(0, 40)} 호텔` : "호텔 추천",
      };
    case "movie":
      return {
        kind,
        text:
          "볼거리 방향만 잡아볼게요 — 코미디 / 스릴러 / 로맨스 / 애니 중 뭐가 당기나요?\n" +
          "지금 인기작은 검색으로 열어둘게요.",
        searchQuery: "지금 볼만한 영화 드라마 추천",
      };
    case "book":
      return {
        kind,
        text: "책도 취향이 갈려요. 소설·에세이·자기계발 중 선호를 말해 주세요. 베스트·추천 검색을 열어둘게요.",
        searchQuery: "읽을만한 책 추천",
      };
    case "gift":
      return {
        kind,
        text: "선물 예산대·받는 분(친구/연인/부모님)을 알려주면 더 정확해요. 인기 선물 아이디어 검색을 열어둘게요.",
        searchQuery: "센스있는 선물 추천",
      };
    case "workout":
      return {
        kind,
        text: "운동은 목적(체중·근력·스트레칭)에 따라 달라요. 홈트/헬스장 루틴 검색을 열어둘게요.",
        searchQuery: "초보 홈트 루틴",
        youtubeQuery: "초보 홈트 20분",
      };
    case "date":
      return {
        kind,
        text:
          "데이트 코스 예시: 카페 → 산책/전시 → 저녁 맛집.\n" +
          "지역을 말해 주면 지도 검색을 맞춰 열게요.",
        mapsQuery: "데이트 코스 맛집",
        searchQuery: "데이트 코스 추천",
      };
    case "study":
      return {
        kind,
        text: "공부 루틴은 집중 시간·과목에 따라 달라요. 뽀모도로·집중 팁 검색을 열어둘게요.",
        searchQuery: "공부 집중 방법",
        youtubeQuery: "공부할 때 듣는 lofi",
      };
    case "fashion":
      return {
        kind,
        text: "코디는 날씨·TPO가 중요해요. 시즌 코디 검색을 열어둘게요.",
        searchQuery: "데일리 코디 추천",
      };
    default:
      return { kind, text: "추천 방향을 조금 더 구체적으로 말해 줄래요?" };
  }
}
