/**
 * Offline phrase/word dictionary for translation without network.
 * Covers travel & daily speech for major language pairs via Korean pivot.
 */

type Dict = Record<string, string>

/** Normalize for lookup: trim, lower (latin), collapse spaces, strip punctuation edges */
export function normalizePhrase(s: string): string {
  return s
    .trim()
    .replace(/[?!.,。！？、，~…·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function lowerKey(s: string): string {
  return normalizePhrase(s).toLowerCase()
}

/** Korean → English */
const KO_EN: Dict = {
  안녕하세요: 'Hello',
  안녕: 'Hi',
  반갑습니다: 'Nice to meet you',
  만나서반가워요: 'Nice to meet you',
  감사합니다: 'Thank you',
  고맙습니다: 'Thank you',
  고마워: 'Thanks',
  천만에요: "You're welcome",
  죄송합니다: 'I am sorry',
  미안합니다: 'I am sorry',
  미안해: 'Sorry',
  괜찮아요: "It's okay",
  네: 'Yes',
  예: 'Yes',
  아니요: 'No',
  아니: 'No',
  모르겠어요: "I don't know",
  도와주세요: 'Please help me',
  실례합니다: 'Excuse me',
  잠깐만요: 'Just a moment',
  기다려주세요: 'Please wait',
  얼마예요: 'How much is it?',
  얼마에요: 'How much is it?',
  계산해주세요: 'Check please',
  메뉴판주세요: 'Menu please',
  물주세요: 'Water please',
  화장실어디예요: 'Where is the bathroom?',
  화장실이어디예요: 'Where is the bathroom?',
  역이어디예요: 'Where is the station?',
  공항이어디예요: 'Where is the airport?',
  호텔이어디예요: 'Where is the hotel?',
  길잃어버렸어요: 'I am lost',
  영어하세요: 'Do you speak English?',
  한국어하세요: 'Do you speak Korean?',
  이해못해요: "I don't understand",
  다시말해주세요: 'Please say that again',
  천천히말해주세요: 'Please speak slowly',
  사진찍어도돼요: 'May I take a photo?',
  와이파이있어요: 'Is there Wi-Fi?',
  비밀번호뭐예요: 'What is the password?',
  카드돼요: 'Do you take cards?',
  현금만돼요: 'Cash only',
  예약했어요: 'I have a reservation',
  이름이에요: 'My name is',
  저는한국에서왔어요: 'I am from Korea',
  맛있어요: 'It is delicious',
  맛없어요: 'It does not taste good',
  배고파요: 'I am hungry',
  목말라요: 'I am thirsty',
  피곤해요: 'I am tired',
  아파요: 'I am in pain',
  의사선생님필요해요: 'I need a doctor',
  경찰불러주세요: 'Please call the police',
  응급상황이에요: 'This is an emergency',
  오늘날씨어때요: 'How is the weather today?',
  몇시예요: 'What time is it?',
  오늘며칠이에요: 'What is the date today?',
  왼쪽: 'left',
  오른쪽: 'right',
  직진: 'go straight',
  여기: 'here',
  저기: 'there',
  이것: 'this',
  저것: 'that',
  주세요: 'please',
  해요: 'do it',
  좋아요: 'good',
  싫어요: 'I do not like it',
  사랑해요: 'I love you',
  보고싶어요: 'I miss you',
  잘자요: 'Good night',
  좋은아침이에요: 'Good morning',
  안녕히가세요: 'Goodbye',
  안녕히계세요: 'Goodbye',
  또봐요: 'See you',
  내일봐요: 'See you tomorrow',
  어디에있어요: 'Where is it?',
  언제예요: 'When is it?',
  왜요: 'Why?',
  어떻게해요: 'How do I do it?',
  누가: 'who',
  무엇: 'what',
  뭐예요: 'What is it?',
  도와주실수있어요: 'Can you help me?',
  택시불러주세요: 'Please call a taxi',
  영수증주세요: 'Receipt please',
  포장해주세요: 'Takeout please',
  매워요: 'It is spicy',
  안매운걸로주세요: 'Not spicy please',
  알레르기있어요: 'I have an allergy',
  채식주의자예요: 'I am vegetarian',
  예약확인하고싶어요: 'I want to check my reservation',
  체크인하고싶어요: 'I want to check in',
  체크아웃할게요: 'I will check out',
  방이있어요: 'Do you have a room?',
  무료인가요: 'Is it free?',
  할인돼요: 'Is there a discount?',
  추천해주세요: 'Please recommend',
  유명한곳이어디예요: 'Where is a famous place?',
  사진좀찍어주세요: 'Please take a photo of me',
  충전해도돼요: 'May I charge my phone?',
  인터넷되나요: 'Is there internet?',
  신호없어요: 'There is no signal',
  배터리가없어요: 'My battery is dead',
  충전기있어요: 'Do you have a charger?',
  잃어버렸어요: 'I lost it',
  찾았어요: 'I found it',
  문이어디에있어요: 'Where is the door?',
  출구어디예요: 'Where is the exit?',
  입구어디예요: 'Where is the entrance?',
  표있어요: 'Do you have tickets?',
  표두장주세요: 'Two tickets please',
  아이한명있어요: 'I have one child',
  가족이있어요: 'I am with family',
  혼자예요: 'I am alone',
  친구랑왔어요: 'I came with a friend',
  사진찍어도될까요: 'May I take a picture?',
  입장료얼마예요: 'How much is the admission?',
  영업시간이어떻게돼요: 'What are the business hours?',
  지금열려있어요: 'Are you open now?',
  몇시에닫아요: 'What time do you close?',
  내일다시올게요: 'I will come again tomorrow',
  오늘좋아요: 'Today is good',
  날씨가좋아요: 'The weather is nice',
  비가와요: 'It is raining',
  추워요: 'It is cold',
  더워요: 'It is hot',
  도와줘서고마워요: 'Thank you for helping',
  정말고마워요: 'Thank you so much',
  괜찮습니다: 'I am fine',
  문제없어요: 'No problem',
  알겠습니다: 'I understand',
  알겠어요: 'Got it',
  잠깐만요기다려주세요: 'Please wait a moment',
  천천히해주세요: 'Please do it slowly',
  크게말해주세요: 'Please speak louder',
  적어주세요: 'Please write it down',
  보여주세요: 'Please show me',
  이쪽이에요: 'This way',
  저쪽이에요: 'That way',
  가까워요: 'It is close',
  멀어요: 'It is far',
  걸어갈수있어요: 'I can walk there',
  지하철타려면어디예요: 'Where do I take the subway?',
  버스정류장어디예요: 'Where is the bus stop?',
  몇번버스예요: 'Which bus number is it?',
  여기서내려요: 'I get off here',
  다음정거장에서내려요: 'I get off at the next stop',
  길이막혔어요: 'There is a traffic jam',
  늦을것같아요: 'I think I will be late',
  약속있어요: 'I have an appointment',
  회의중이에요: 'I am in a meeting',
  바빠요: 'I am busy',
  한가해요: 'I am free',
  할수있어요: 'I can do it',
  못해요: 'I cannot',
  원해요: 'I want it',
  필요해요: 'I need it',
  가지고있어요: 'I have it',
  없어요: 'I do not have it',
  있어요: 'There is / I have',
  맞아요: 'That is correct',
  틀렸어요: 'That is wrong',
  진짜요: 'Really?',
  대박이에요: 'That is awesome',
  조심하세요: 'Be careful',
  건강하세요: 'Stay healthy',
  축하해요: 'Congratulations',
  생일축하해요: 'Happy birthday',
  새해복많이받으세요: 'Happy New Year',
  메리크리스마스: 'Merry Christmas',
  화이팅: 'Fighting / You can do it',
  잘했어요: 'Well done',
  멋져요: 'You look cool',
  아름다워요: 'It is beautiful',
  재미있어요: 'It is fun',
  지루해요: 'It is boring',
  어려워요: 'It is difficult',
  쉬워요: 'It is easy',
  비싸요: 'It is expensive',
  싸요: 'It is cheap',
  할인해주세요: 'Please give a discount',
  이거얼마예요: 'How much is this?',
  저것주세요: 'That one please',
  이거주세요: 'This one please',
  다른거있어요: 'Do you have something else?',
  사이즈있어요: 'Do you have this size?',
  색깔바꿔주세요: 'Please change the color',
  환불하고싶어요: 'I want a refund',
  교환하고싶어요: 'I want to exchange this',
  수리해주세요: 'Please repair it',
  고장났어요: 'It is broken',
  작동안해요: 'It does not work',
  켜주세요: 'Please turn it on',
  꺼주세요: 'Please turn it off',
  에어컨켜주세요: 'Please turn on the AC',
  난방켜주세요: 'Please turn on the heat',
  창문열어주세요: 'Please open the window',
  문닫아주세요: 'Please close the door',
  조용히해주세요: 'Please be quiet',
  급해요: 'It is urgent',
  천천히해도돼요: 'You can take your time',
  지금가요: 'I am going now',
  나중에할게요: 'I will do it later',
  내일할게요: 'I will do it tomorrow',
  오늘할수있어요: 'I can do it today',
  여기서기다려요: 'I will wait here',
  같이가요: "Let's go together",
  먼저가세요: 'You go first',
  따라와주세요: 'Please follow me',
  멈춰주세요: 'Please stop',
  시작해요: "Let's start",
  끝났어요: 'It is finished',
  계속해요: 'Please continue',
  다시해요: 'Please do it again',
  취소할게요: 'I will cancel',
  확인했어요: 'I confirmed',
  보냈어요: 'I sent it',
  받았어요: 'I received it',
  전화할게요: 'I will call you',
  문자보낼게요: 'I will text you',
  이메일본냈어요: 'I sent an email',
  주소가뭐예요: 'What is the address?',
  전화번호가뭐예요: 'What is the phone number?',
  이름이뭐예요: 'What is your name?',
  저는김성규예요: 'My name is Kim Seonggyu',
  반갑습니다잘부탁해요: 'Nice to meet you, please take care of me',
}

/** English → Korean (inverse + extras) */
const EN_KO: Dict = Object.fromEntries(
  Object.entries(KO_EN).map(([k, v]) => [lowerKey(v), k]),
)

Object.assign(EN_KO, {
  hello: '안녕하세요',
  hi: '안녕',
  'thank you': '감사합니다',
  thanks: '고마워',
  'good morning': '좋은 아침이에요',
  'good night': '잘 자요',
  goodbye: '안녕히 가세요',
  bye: '안녕',
  yes: '네',
  no: '아니요',
  please: '부탁합니다',
  sorry: '죄송합니다',
  'excuse me': '실례합니다',
  help: '도와주세요',
  'how much': '얼마예요?',
  'where is the bathroom': '화장실이 어디예요?',
  'i love you': '사랑해요',
  'nice to meet you': '만나서 반가워요',
  "i don't understand": '이해 못 해요',
  'speak slowly': '천천히 말해주세요',
  water: '물',
  food: '음식',
  taxi: '택시',
  hotel: '호텔',
  airport: '공항',
  station: '역',
  hospital: '병원',
  police: '경찰',
  today: '오늘',
  tomorrow: '내일',
  yesterday: '어제',
  now: '지금',
  later: '나중에',
  'how are you': '어떻게 지내세요?',
  'i am fine': '저는 괜찮아요',
  'what is this': '이게 뭐예요?',
  'where is it': '어디에 있어요?',
  'i need help': '도움이 필요해요',
  'call a taxi': '택시 불러주세요',
  delicious: '맛있어요',
  expensive: '비싸요',
  cheap: '싸요',
  open: '열려 있어요',
  closed: '닫혔어요',
  left: '왼쪽',
  right: '오른쪽',
  'go straight': '직진',
  stop: '멈춰주세요',
  wait: '기다려주세요',
})

/** Korean → Japanese */
const KO_JA: Dict = {
  안녕하세요: 'こんにちは',
  안녕: 'やあ',
  감사합니다: 'ありがとうございます',
  고맙습니다: 'ありがとうございます',
  죄송합니다: 'すみません',
  미안합니다: 'ごめんなさい',
  네: 'はい',
  아니요: 'いいえ',
  도와주세요: '助けてください',
  얼마예요: 'いくらですか',
  화장실어디예요: 'トイレはどこですか',
  맛있어요: 'おいしいです',
  물주세요: '水をください',
  사랑해요: '愛しています',
  안녕히가세요: 'さようなら',
  좋은아침이에요: 'おはようございます',
  잘자요: 'おやすみなさい',
  이해못해요: '分かりません',
  다시말해주세요: 'もう一度言ってください',
  천천히말해주세요: 'ゆっくり話してください',
  계산해주세요: 'お会計お願いします',
  메뉴판주세요: 'メニューをください',
  모르겠어요: '分かりません',
  괜찮아요: '大丈夫です',
  배고파요: 'お腹が空きました',
  피곤해요: '疲れました',
  얼마에요: 'いくらですか',
  이거주세요: 'これをください',
  저기요: 'すみません',
  실례합니다: '失礼します',
  반갑습니다: 'はじめまして',
  추천해주세요: 'おすすめを教えてください',
  영어하세요: '英語を話せますか',
  한국어하세요: '韓国語を話せますか',
  사진찍어도돼요: '写真を撮ってもいいですか',
  와이파이있어요: 'Wi-Fiはありますか',
  카드돼요: 'カードは使えますか',
  예약했어요: '予約しました',
  체크인하고싶어요: 'チェックインしたいです',
  체크아웃할게요: 'チェックアウトします',
  택시불러주세요: 'タクシーを呼んでください',
  역이어디예요: '駅はどこですか',
  공항이어디예요: '空港はどこですか',
  호텔이어디예요: 'ホテルはどこですか',
  길잃어버렸어요: '道に迷いました',
  의사선생님필요해요: '医者が必要です',
  경찰불러주세요: '警察を呼んでください',
  비싸요: '高いです',
  싸요: '安いです',
  좋아요: 'いいです',
  싫어요: '嫌です',
  추워요: '寒いです',
  더워요: '暑いです',
  비가와요: '雨が降っています',
  몇시예요: '今何時ですか',
  어디예요: 'どこですか',
  뭐예요: '何ですか',
}

const JA_KO: Dict = Object.fromEntries(Object.entries(KO_JA).map(([k, v]) => [v, k]))
Object.assign(JA_KO, {
  こんにちは: '안녕하세요',
  ありがとう: '고마워요',
  ありがとうございます: '감사합니다',
  すみません: '죄송합니다',
  はい: '네',
  いいえ: '아니요',
  おいしい: '맛있어요',
  ください: '주세요',
  どこですか: '어디예요?',
  いくらですか: '얼마예요?',
  わかりません: '모르겠어요',
  さようなら: '안녕히 가세요',
  おはよう: '좋은 아침',
  おはようございます: '좋은 아침이에요',
  おやすみ: '잘 자요',
  助けて: '도와주세요',
  トイレ: '화장실',
  水: '물',
  駅: '역',
  空港: '공항',
  ホテル: '호텔',
})

/** Korean → Chinese (Simplified) */
const KO_ZH: Dict = {
  안녕하세요: '你好',
  감사합니다: '谢谢',
  죄송합니다: '对不起',
  네: '是',
  아니요: '不是',
  도와주세요: '请帮我',
  얼마예요: '多少钱',
  화장실어디예요: '厕所在哪里',
  맛있어요: '好吃',
  물주세요: '请给我水',
  사랑해요: '我爱你',
  안녕히가세요: '再见',
  좋은아침이에요: '早上好',
  잘자요: '晚安',
  이해못해요: '我不明白',
  천천히말해주세요: '请说慢一点',
  계산해주세요: '请结账',
  메뉴판주세요: '请给我菜单',
  택시불러주세요: '请叫出租车',
  역이어디예요: '车站在哪里',
  공항이어디예요: '机场在哪里',
  호텔이어디예요: '酒店在哪里',
  길잃어버렸어요: '我迷路了',
  예약했어요: '我预订了',
  카드돼요: '可以刷卡吗',
  와이파이있어요: '有无线网吗',
  비싸요: '贵',
  싸요: '便宜',
  좋아요: '好',
  추워요: '冷',
  더워요: '热',
}

const ZH_KO: Dict = Object.fromEntries(Object.entries(KO_ZH).map(([k, v]) => [v, k]))
Object.assign(ZH_KO, {
  你好: '안녕하세요',
  谢谢: '감사합니다',
  对不起: '죄송합니다',
  是: '네',
  不是: '아니요',
  多少钱: '얼마예요?',
  厕所在哪里: '화장실이 어디예요?',
  好吃: '맛있어요',
  再见: '안녕히 가세요',
  请帮我: '도와주세요',
  我不明白: '이해 못 해요',
})

/** Korean → Spanish */
const KO_ES: Dict = {
  안녕하세요: 'Hola',
  감사합니다: 'Gracias',
  죄송합니다: 'Lo siento',
  네: 'Sí',
  아니요: 'No',
  도와주세요: 'Ayúdeme por favor',
  얼마예요: '¿Cuánto cuesta?',
  화장실어디예요: '¿Dónde está el baño?',
  맛있어요: 'Está delicioso',
  물주세요: 'Agua por favor',
  사랑해요: 'Te quiero',
  안녕히가세요: 'Adiós',
  좋은아침이에요: 'Buenos días',
  잘자요: 'Buenas noches',
  이해못해요: 'No entiendo',
  천천히말해주세요: 'Hable más despacio por favor',
}

const ES_KO: Dict = Object.fromEntries(
  Object.entries(KO_ES).map(([k, v]) => [lowerKey(v), k]),
)

/** Korean → French */
const KO_FR: Dict = {
  안녕하세요: 'Bonjour',
  감사합니다: 'Merci',
  죄송합니다: 'Je suis désolé',
  네: 'Oui',
  아니요: 'Non',
  도와주세요: "Aidez-moi s'il vous plaît",
  얼마예요: 'Combien ça coûte?',
  화장실어디예요: 'Où sont les toilettes?',
  맛있어요: "C'est délicieux",
  물주세요: "De l'eau s'il vous plaît",
  사랑해요: 'Je t\'aime',
  안녕히가세요: 'Au revoir',
  좋은아침이에요: 'Bonjour',
  잘자요: 'Bonne nuit',
  이해못해요: 'Je ne comprends pas',
}

const FR_KO: Dict = Object.fromEntries(
  Object.entries(KO_FR).map(([k, v]) => [lowerKey(v), k]),
)

/** Korean → German */
const KO_DE: Dict = {
  안녕하세요: 'Hallo',
  감사합니다: 'Danke',
  죄송합니다: 'Es tut mir leid',
  네: 'Ja',
  아니요: 'Nein',
  도와주세요: 'Hilfe bitte',
  얼마예요: 'Wie viel kostet das?',
  화장실어디예요: 'Wo ist die Toilette?',
  맛있어요: 'Es ist lecker',
  물주세요: 'Wasser bitte',
  사랑해요: 'Ich liebe dich',
  안녕히가세요: 'Auf Wiedersehen',
  좋은아침이에요: 'Guten Morgen',
  잘자요: 'Gute Nacht',
  이해못해요: 'Ich verstehe nicht',
}

const DE_KO: Dict = Object.fromEntries(
  Object.entries(KO_DE).map(([k, v]) => [lowerKey(v), k]),
)

/** Korean → Vietnamese */
const KO_VI: Dict = {
  안녕하세요: 'Xin chào',
  안녕: 'Chào',
  감사합니다: 'Cảm ơn',
  고맙습니다: 'Cảm ơn',
  죄송합니다: 'Xin lỗi',
  미안합니다: 'Xin lỗi',
  네: 'Vâng',
  아니요: 'Không',
  도와주세요: 'Làm ơn giúp tôi',
  얼마예요: 'Bao nhiêu tiền?',
  화장실어디예요: 'Nhà vệ sinh ở đâu?',
  맛있어요: 'Ngon quá',
  물주세요: 'Cho tôi nước',
  사랑해요: 'Anh yêu em',
  안녕히가세요: 'Tạm biệt',
  이해못해요: 'Tôi không hiểu',
  천천히말해주세요: 'Làm ơn nói chậm hơn',
  다시말해주세요: 'Làm ơn nói lại',
  나는이미식사를했어요: 'Tôi đã ăn rồi',
  이미식사를했어요: 'Tôi đã ăn rồi',
  식사했어요: 'Tôi đã ăn rồi',
  밥먹었어요: 'Tôi đã ăn cơm rồi',
  아직안먹었어요: 'Tôi chưa ăn',
  배고파요: 'Tôi đói',
  배불러요: 'Tôi no',
  목말라요: 'Tôi khát',
  메뉴판주세요: 'Cho tôi xem thực đơn',
  계산해주세요: 'Tính tiền giúp tôi',
  맛있게드세요: 'Chúc ngon miệng',
  추천해주세요: 'Làm ơn giới thiệu',
  매워요: 'Cay quá',
  안매운걸로주세요: 'Cho tôi món không cay',
  고기주세요: 'Cho tôi thịt',
  채소주세요: 'Cho tôi rau',
  밥주세요: 'Cho tôi cơm',
  국물주세요: 'Cho tôi nước dùng',
  젓가락주세요: 'Cho tôi đôi đũa',
  포크주세요: 'Cho tôi cái nĩa',
  화장실이어디예요: 'Nhà vệ sinh ở đâu?',
  역이어디예요: 'Ga ở đâu?',
  공항이어디예요: 'Sân bay ở đâu?',
  호텔이어디예요: 'Khách sạn ở đâu?',
  길잃어버렸어요: 'Tôi bị lạc',
  택시불러주세요: 'Làm ơn gọi taxi',
  얼마에요: 'Bao nhiêu tiền?',
  이거주세요: 'Cho tôi cái này',
  저것주세요: 'Cho tôi cái kia',
  카드돼요: 'Có nhận thẻ không?',
  현금만돼요: 'Chỉ nhận tiền mặt',
  와이파이있어요: 'Có Wi-Fi không?',
  예약했어요: 'Tôi đã đặt chỗ',
  체크인하고싶어요: 'Tôi muốn check-in',
  체크아웃할게요: 'Tôi sẽ check-out',
  좋은아침이에요: 'Chào buổi sáng',
  잘자요: 'Chúc ngủ ngon',
  반갑습니다: 'Rất vui được gặp bạn',
  만나서반가워요: 'Rất vui được gặp bạn',
  몇시예요: 'Bây giờ là mấy giờ?',
  어디에있어요: 'Ở đâu?',
  뭐예요: 'Cái gì vậy?',
  얼마예요이거: 'Cái này bao nhiêu tiền?',
  비싸요: 'Đắt quá',
  싸요: 'Rẻ',
  좋아요: 'Tốt',
  싫어요: 'Không thích',
  괜찮아요: 'Không sao',
  모르겠어요: 'Tôi không biết',
  할수있어요: 'Tôi có thể',
  못해요: 'Tôi không thể',
  필요해요: 'Tôi cần',
  원해요: 'Tôi muốn',
  있어요: 'Có',
  없어요: 'Không có',
  잠깐만요: 'Xin đợi một chút',
  기다려주세요: 'Làm ơn đợi',
  실례합니다: 'Xin lỗi',
  영어로하세요: 'Bạn nói được tiếng Anh không?',
  한국어하세요: 'Bạn nói được tiếng Hàn không?',
  저는한국에서왔어요: 'Tôi đến từ Hàn Quốc',
  이름이뭐예요: 'Tên bạn là gì?',
  오늘날씨어때요: 'Hôm nay thời tiết thế nào?',
  추워요: 'Lạnh',
  더워요: 'Nóng',
  비가와요: 'Trời đang mưa',
  도와줘서고마워요: 'Cảm ơn đã giúp đỡ',
  정말고마워요: 'Cảm ơn rất nhiều',
  알겠습니다: 'Tôi hiểu rồi',
  문제없어요: 'Không vấn đề gì',
  같이가요: 'Đi cùng nhau nhé',
  먼저가세요: 'Bạn đi trước đi',
  멈춰주세요: 'Làm ơn dừng lại',
  시작해요: 'Bắt đầu nào',
  끝났어요: 'Xong rồi',
  취소할게요: 'Tôi sẽ hủy',
  확인했어요: 'Tôi đã xác nhận',
  전화할게요: 'Tôi sẽ gọi điện',
  주소가뭐예요: 'Địa chỉ là gì?',
  전화번호가뭐예요: 'Số điện thoại là gì?',
  의사선생님필요해요: 'Tôi cần bác sĩ',
  경찰불러주세요: 'Làm ơn gọi cảnh sát',
  응급상황이에요: 'Đây là trường hợp khẩn cấp',
  아파요: 'Tôi đau',
  피곤해요: 'Tôi mệt',
  재미있어요: 'Vui quá',
  어려워요: 'Khó quá',
  쉬워요: 'Dễ',
  직진: 'Đi thẳng',
  왼쪽: 'Bên trái',
  오른쪽: 'Bên phải',
  여기: 'Ở đây',
  저기: 'Ở đằng kia',
  주세요: 'Làm ơn cho tôi',
}

const VI_KO: Dict = Object.fromEntries(
  Object.entries(KO_VI).map(([k, v]) => [lowerKey(v), k]),
)

type PairKey = string

function pairKey(from: string, to: string): PairKey {
  return `${from}|${to}`
}

const TABLES: Record<PairKey, Dict> = {
  [pairKey('ko', 'en')]: KO_EN,
  [pairKey('en', 'ko')]: EN_KO,
  [pairKey('ko', 'ja')]: KO_JA,
  [pairKey('ja', 'ko')]: JA_KO,
  [pairKey('ko', 'zh-CN')]: KO_ZH,
  [pairKey('zh-CN', 'ko')]: ZH_KO,
  [pairKey('ko', 'zh-TW')]: KO_ZH,
  [pairKey('zh-TW', 'ko')]: ZH_KO,
  [pairKey('ko', 'es')]: KO_ES,
  [pairKey('es', 'ko')]: ES_KO,
  [pairKey('ko', 'fr')]: KO_FR,
  [pairKey('fr', 'ko')]: FR_KO,
  [pairKey('ko', 'de')]: KO_DE,
  [pairKey('de', 'ko')]: DE_KO,
  [pairKey('ko', 'vi')]: KO_VI,
  [pairKey('vi', 'ko')]: VI_KO,
}

function compactKo(s: string): string {
  return normalizePhrase(s).replace(/\s+/g, '')
}

function lookupExact(table: Dict, text: string, from: string): string | null {
  const n = normalizePhrase(text)
  if (table[n]) return table[n]
  if (from === 'ko') {
    const c = compactKo(n)
    if (table[c]) return table[c]
    // try without spaces in keys
    for (const [k, v] of Object.entries(table)) {
      if (compactKo(k) === c) return v
    }
  } else {
    const l = lowerKey(n)
    if (table[l]) return table[l]
    for (const [k, v] of Object.entries(table)) {
      if (lowerKey(k) === l) return v
    }
  }
  return null
}

/** Longest-prefix / contains phrase matching for compound sentences */
function lookupPhrases(table: Dict, text: string, from: string): { out: string; covered: boolean } | null {
  const exact = lookupExact(table, text, from)
  if (exact) return { out: exact, covered: true }

  const entries = Object.entries(table).sort((a, b) => b[0].length - a[0].length)
  let remaining = from === 'ko' ? compactKo(text) : lowerKey(text)
  const parts: string[] = []
  let progressed = false

  // Greedy replace known phrases
  let guard = 0
  while (remaining && guard++ < 40) {
    let hit = false
    for (const [src, dst] of entries) {
      const key = from === 'ko' ? compactKo(src) : lowerKey(src)
      if (!key || key.length < 2) continue
      const idx = remaining.indexOf(key)
      if (idx === 0 || (from !== 'ko' && idx >= 0 && (idx === 0 || remaining[idx - 1] === ' '))) {
        if (idx > 0) {
          // skip unmatched head for non-ko slightly
          if (from === 'ko') break
        }
        if (idx === 0) {
          parts.push(dst)
          remaining = remaining.slice(key.length).trim()
          hit = true
          progressed = true
          break
        }
      }
    }
    if (!hit) break
  }

  if (progressed && parts.length && remaining.length === 0) {
    const joiner = from === 'ja' || from === 'zh-CN' || from === 'zh-TW' ? '' : ' '
    return { out: parts.join(joiner), covered: true }
  }
  if (progressed && parts.length) {
    return { out: parts.join(' '), covered: false }
  }
  return null
}

const CACHE_KEY = 'jarvis.translate.cache.v1'

function loadCache(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {}
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function saveCacheEntry(from: string, to: string, src: string, dst: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    const cache = loadCache()
    const key = `${from}|${to}|${normalizePhrase(src).toLowerCase()}`
    cache[key] = dst
    // keep cache bounded
    const keys = Object.keys(cache)
    if (keys.length > 400) {
      for (const k of keys.slice(0, keys.length - 350)) delete cache[k]
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore quota */
  }
}

function cacheLookup(from: string, to: string, src: string): string | null {
  const cache = loadCache()
  return cache[`${from}|${to}|${normalizePhrase(src).toLowerCase()}`] || null
}

function viaKorean(from: string, to: string, text: string): string | null {
  if (from === 'ko' || to === 'ko') return null
  const toKo = TABLES[pairKey(from, 'ko')]
  const fromKo = TABLES[pairKey('ko', to)]
  if (!toKo || !fromKo) return null
  const mid = lookupExact(toKo, text, from) || lookupPhrases(toKo, text, from)?.out
  if (!mid) return null
  return lookupExact(fromKo, mid, 'ko') || lookupPhrases(fromKo, mid, 'ko')?.out || null
}

export interface OfflineTranslateResult {
  ok: boolean
  text: string
  partial?: boolean
  method: 'dict' | 'cache' | 'pivot' | 'none'
}

export function translateOffline(text: string, from: string, to: string): OfflineTranslateResult {
  const q = text.trim()
  if (!q) return { ok: false, text: '', method: 'none' }
  if (from === to) return { ok: true, text: q, method: 'dict' }

  const cached = cacheLookup(from, to, q)
  if (cached) return { ok: true, text: cached, method: 'cache' }

  const table = TABLES[pairKey(from, to)]
  if (table) {
    const exact = lookupExact(table, q, from)
    if (exact) return { ok: true, text: exact, method: 'dict' }
    const phrases = lookupPhrases(table, q, from)
    if (phrases?.covered) return { ok: true, text: phrases.out, method: 'dict' }
    if (phrases?.out) return { ok: true, text: phrases.out, partial: true, method: 'dict' }
  }

  const pivoted = viaKorean(from, to, q)
  if (pivoted) return { ok: true, text: pivoted, method: 'pivot' }

  return { ok: false, text: '', method: 'none' }
}

export function rememberTranslation(from: string, to: string, src: string, dst: string): void {
  saveCacheEntry(from, to, src, dst)
}

export function offlinePairSupported(from: string, to: string): boolean {
  return Boolean(TABLES[pairKey(from, to)] || (from !== 'ko' && to !== 'ko' && TABLES[pairKey(from, 'ko')] && TABLES[pairKey('ko', to)]))
}
