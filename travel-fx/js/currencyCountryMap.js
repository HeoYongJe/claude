// 한국수출입은행 API의 cur_unit 값 -> 여행지 국가 정보 매핑
// cur_unit은 API가 실제로 내려주는 문자열 그대로 key로 사용한다.
// (일부 통화는 "JPY(100)"처럼 100단위 표기가 붙어서 내려오므로 주의)
const CURRENCY_COUNTRY_MAP = {
  "USD": { country: "미국", flag: "🇺🇸" },
  "JPY(100)": { country: "일본", flag: "🇯🇵" },
  "EUR": { country: "유럽연합", flag: "🇪🇺" },
  "GBP": { country: "영국", flag: "🇬🇧" },
  "CAD": { country: "캐나다", flag: "🇨🇦" },
  "CHF": { country: "스위스", flag: "🇨🇭" },
  "HKD": { country: "홍콩", flag: "🇭🇰" },
  "AUD": { country: "호주", flag: "🇦🇺" },
  "NZD": { country: "뉴질랜드", flag: "🇳🇿" },
  "SGD": { country: "싱가포르", flag: "🇸🇬" },
  "CNH": { country: "중국", flag: "🇨🇳" },
  "THB": { country: "태국", flag: "🇹🇭" },
  "TWD": { country: "대만", flag: "🇹🇼" },
  "IDR(100)": { country: "인도네시아", flag: "🇮🇩" },
  "MYR": { country: "말레이시아", flag: "🇲🇾" },
  "VND(100)": { country: "베트남", flag: "🇻🇳" },
  "PHP": { country: "필리핀", flag: "🇵🇭" },
  "TRY": { country: "튀르키예", flag: "🇹🇷" },
  "SEK": { country: "스웨덴", flag: "🇸🇪" },
  "NOK": { country: "노르웨이", flag: "🇳🇴" },
  "DKK": { country: "덴마크", flag: "🇩🇰" },
  "MXN": { country: "멕시코", flag: "🇲🇽" },
};
