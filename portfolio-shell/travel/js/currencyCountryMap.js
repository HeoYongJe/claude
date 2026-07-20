// 한국수출입은행 API의 cur_unit 값 -> 여행지 국가 정보 매핑
// cur_unit은 API가 실제로 내려주는 문자열 그대로 key로 사용한다.
// (일부 통화는 "JPY(100)"처럼 100단위 표기가 붙어서 내려오므로 주의)
// unit: 화면에 "1달러 = ...", "100엔 = ..." 처럼 보여줄 때 쓰는 통화 단위 이름.
// code: ISO 3166 국가코드(소문자). 국기 이미지(flagcdn) 주소에 사용.
//       Windows가 국기 이모지를 지원하지 않아 이모지 대신 실제 국기 SVG를 쓴다.
const CURRENCY_COUNTRY_MAP = {
  "USD": { country: "미국", code: "us", unit: "달러" },
  "JPY(100)": { country: "일본", code: "jp", unit: "엔" },
  "EUR": { country: "유럽연합", code: "eu", unit: "유로" },
  "GBP": { country: "영국", code: "gb", unit: "파운드" },
  "CAD": { country: "캐나다", code: "ca", unit: "달러" },
  "CHF": { country: "스위스", code: "ch", unit: "프랑" },
  "HKD": { country: "홍콩", code: "hk", unit: "달러" },
  "AUD": { country: "호주", code: "au", unit: "달러" },
  "NZD": { country: "뉴질랜드", code: "nz", unit: "달러" },
  "SGD": { country: "싱가포르", code: "sg", unit: "달러" },
  "CNH": { country: "중국", code: "cn", unit: "위안" },
  "THB": { country: "태국", code: "th", unit: "바트" },
  "TWD": { country: "대만", code: "tw", unit: "달러" },
  "IDR(100)": { country: "인도네시아", code: "id", unit: "루피아" },
  "MYR": { country: "말레이시아", code: "my", unit: "링깃" },
  "VND(100)": { country: "베트남", code: "vn", unit: "동" },
  "PHP": { country: "필리핀", code: "ph", unit: "페소" },
  "TRY": { country: "튀르키예", code: "tr", unit: "리라" },
  "SEK": { country: "스웨덴", code: "se", unit: "크로나" },
  "NOK": { country: "노르웨이", code: "no", unit: "크로네" },
  "DKK": { country: "덴마크", code: "dk", unit: "크로네" },
  "MXN": { country: "멕시코", code: "mx", unit: "페소" },
};

// 브라우저에서는 전역 상수로, Node(server.js)에서는 require로 재사용.
if (typeof module !== "undefined" && module.exports) module.exports = CURRENCY_COUNTRY_MAP;
