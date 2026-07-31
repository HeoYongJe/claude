// 자동 생성 파일 — tools/fetch-city-images.js 로 갱신. 직접 수정하지 말 것.
// 도시명 → 위키미디어 대표 이미지 URL. citiesHtml에서 ci.img 없을 때 폴백으로 사용.
const CITY_IMAGES = {
  "도쿄": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Tokyo_Montage_2015.jpg/500px-Tokyo_Montage_2015.jpg",
  "오사카": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Osaka_Castle_03bs3200.jpg/500px-Osaka_Castle_03bs3200.jpg",
  "후쿠오카": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Fukuoka_City_-_Montage_-_01.JPG/500px-Fukuoka_City_-_Montage_-_01.JPG",
  "다낭": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Han_River_Bridge_in_Vietnam_Night_View.jpg/500px-Han_River_Bridge_in_Vietnam_Night_View.jpg",
  "하노이": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Hanoi_Panorama_-_NKS.jpg/500px-Hanoi_Panorama_-_NKS.jpg",
  "방콕": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Bangkok_montage_3.jpg/500px-Bangkok_montage_3.jpg",
  "치앙마이": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Chiang_Mai_City.png/500px-Chiang_Mai_City.png",
  "푸껫": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Phuket_shore.jpg/500px-Phuket_shore.jpg",
  "타이베이": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Taipei_Skyline_2022.06.29.jpg/500px-Taipei_Skyline_2022.06.29.jpg",
  "가오슝": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Kaohsiung_skyline_2020_May.jpg/500px-Kaohsiung_skyline_2020_May.jpg",
  "타이중": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Taichung_montage.PNG/500px-Taichung_montage.PNG",
  "보라카이": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Boracay_White_Beach_in_day_%28985286231%29.jpg/500px-Boracay_White_Beach_in_day_%28985286231%29.jpg",
  "발리": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Bali_Rice_Terrace.JPG/500px-Bali_Rice_Terrace.JPG",
  "족자카르타": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Jalan_malioboro_-_Jogjakarta.JPG/500px-Jalan_malioboro_-_Jogjakarta.JPG",
  "오차드": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/New_Orchard_Road_Flower_Zone.jpg/500px-New_Orchard_Road_Flower_Zone.jpg",
  "홍콩섬": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Hongkongisland.png/500px-Hongkongisland.png",
  "상하이": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/The_Hong_Kong_and_Shanghai_Bank%2C_built_in_1923_and_The_Customs_House_built_in_1927.jpg/500px-The_Hong_Kong_and_Shanghai_Bank%2C_built_in_1923_and_The_Customs_House_built_in_1927.jpg",
  "청두": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Scuhuaxi.jpg/500px-Scuhuaxi.jpg",
  "쿠알라룸푸르": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Bukit_Bintang_Junction_in_2023.jpg/500px-Bukit_Bintang_Junction_in_2023.jpg",
  "이스탄불": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Istanbul_collage_5j.jpg/500px-Istanbul_collage_5j.jpg",
  "카파도키아": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Cappadocia_balloon_trip%2C_Ortahisar_Castle_%2811893715185%29.jpg/500px-Cappadocia_balloon_trip%2C_Ortahisar_Castle_%2811893715185%29.jpg",
  "취리히": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/ZurichMontage.jpg/500px-ZurichMontage.jpg"
};
if (typeof module !== "undefined" && module.exports) module.exports = CITY_IMAGES;
