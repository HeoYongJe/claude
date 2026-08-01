// 자동 생성 파일 — tools/fetch-city-images-unsplash.js 로 갱신. 직접 수정하지 말 것.
// 도시명 → Unsplash 이미지 URL. citiesHtml에서 ci.img 없을 때 폴백으로 사용.
const CITY_IMAGES = {
  "도쿄": "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8VG9reW98ZW58MXwwfHx8MTc4NTU3MjE2MXww&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "오사카": "https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8T3Nha2F8ZW58MXwwfHx8MTc4NTU3MjE2MXww&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "후쿠오카": "https://images.unsplash.com/photo-1618897037073-5edb010d92f5?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8RnVrdW9rYXxlbnwxfDB8fHwxNzg1NTcyMTYyfDA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "다낭": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8RGElMjBOYW5nJTIwVmlldG5hbXxlbnwxfDB8fHwxNzg1NTcyMTYzfDA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "하노이": "https://images.unsplash.com/photo-1555921015-5532091f6026?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8SGFub2l8ZW58MXwwfHx8MTc4NTU3MjE2M3ww&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "호치민": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8SG8lMjBDaGklMjBNaW5oJTIwQ2l0eXxlbnwxfDB8fHwxNzg1NTcyMTY0fDA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "방콕": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8QmFuZ2tva3xlbnwxfDB8fHwxNzg1NTcyMTY1fDA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "치앙마이": "https://images.unsplash.com/photo-1599576838688-8a6c11263108?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8Q2hpYW5nJTIwTWFpfGVufDF8MHx8fDE3ODU1NzIxNjV8MA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "푸껫": "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8UGh1a2V0fGVufDF8MHx8fDE3ODU1NzIxNjZ8MA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "타이베이": "https://images.unsplash.com/photo-1598935898639-81586f7d2129?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8VGFpcGVpfGVufDF8MHx8fDE3ODU1NzIxNjd8MA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "가오슝": "https://images.unsplash.com/photo-1677607221983-630ffb5ea1d8?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8S2FvaHNpdW5nfGVufDF8MHx8fDE3ODU1NzIxNjd8MA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "타이중": "https://images.unsplash.com/photo-1583654979589-aa7a6053a0d6?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8VGFpY2h1bmd8ZW58MXwwfHx8MTc4NTU3MjE2OHww&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "세부": "https://images.unsplash.com/photo-1545509703-506872a296cb?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8Q2VidSUyMFBoaWxpcHBpbmVzfGVufDF8MHx8fDE3ODU1NzIxNjl8MA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "마닐라": "https://images.unsplash.com/photo-1598258710957-db8614c2881e?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8TWFuaWxhfGVufDF8MHx8fDE3ODU1NzIxNjl8MA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "보라카이": "https://images.unsplash.com/photo-1530968033775-2c92736b131e?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8Qm9yYWNheXxlbnwxfDB8fHwxNzg1NTcyMTcwfDA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "발리": "https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8QmFsaXxlbnwxfDB8fHwxNzg1NTcyMTcxfDA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "자카르타": "https://images.unsplash.com/photo-1555899434-94d1368aa7af?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8SmFrYXJ0YXxlbnwxfDB8fHwxNzg1NTcyMTcxfDA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "족자카르타": "https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8WW9neWFrYXJ0YXxlbnwxfDB8fHwxNzg1NTcyMTcyfDA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "싱가포르": "https://images.unsplash.com/photo-1775306963755-8897be3967bb?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8U2luZ2Fwb3JlfGVufDF8MHx8fDE3ODU1NzIxNzN8MA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "센토사": "https://images.unsplash.com/photo-1546258608-68797ef96fc8?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8U2VudG9zYSUyMFNpbmdhcG9yZXxlbnwxfDB8fHwxNzg1NTcyMTczfDA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "오차드": "https://images.unsplash.com/photo-1559329187-324b79e997b0?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8T3JjaGFyZCUyMFJvYWQlMjBTaW5nYXBvcmV8ZW58MXwwfHx8MTc4NTU3MjE3NHww&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "홍콩섬": "https://images.unsplash.com/photo-1678110721308-a08ed05a7938?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8SG9uZyUyMEtvbmd8ZW58MXwwfHx8MTc4NTU3MjE3NHww&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "구룡": "https://images.unsplash.com/photo-1507941097613-9f2157b69235?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8S293bG9vbiUyMEhvbmclMjBLb25nfGVufDF8MHx8fDE3ODU1NzIxNzV8MA&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "마카오": "https://images.unsplash.com/photo-1708580175277-6c171e822f94?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8TWFjYXV8ZW58MXwwfHx8MTc4NTU3MjE3Nnww&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg",
  "상하이": "https://images.unsplash.com/photo-1538428494232-9c0d8a3ab403?ixid=M3wxMDEzNDM3fDB8MXxzZWFyY2h8MXx8U2hhbmdoYWl8ZW58MXwwfHx8MTc4NTU3MjE3Nnww&ixlib=rb-4.1.0&w=500&h=340&fit=crop&crop=entropy&q=80&fm=jpg"
};
// 사진 크레딧(Unsplash 작가) — 필요 시 표기용.
const CITY_IMAGE_CREDIT = {};
if (typeof module !== "undefined" && module.exports) module.exports = CITY_IMAGES;
