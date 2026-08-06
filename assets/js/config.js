/**
 * 이 파일의 내용만 수정하면 초대장 정보를 변경할 수 있습니다.
 * 사진 파일은 assets/images 폴더에 넣고 경로를 적으세요.
 */
window.INVITATION_CONFIG = {
  site: {
    title: "우리 아이의 첫 번째 생일",
    description: "소중한 분들을 우리 아이의 첫돌에 초대합니다.",
    shareUrl: "https://yoosple.github.io/invitation/"
  },

  baby: {
    name: "최소정",
    englishName: "SOJEONG",
    eventDate: "2026-10-10",
    eventTime: "오후 12시 00분",
    mainImage: "assets/images/main.svg",
    message: `사랑으로 키운 소중한 아이가
어느덧 첫 번째 생일을 맞았습니다.
기쁜 날 함께 축복해 주세요.`
  },

  place: {
    name: "경복궁 노원점",
    address: "서울 노원구 동일로 1608 2층",
    detail: "건물 주차장 이용 가능",
    kakaoMapUrl: "https://kko.to/gcOA6odvqH",
    naverMapUrl: "https://naver.me/5jB7K6Ls"
  },

  parents: [
    { role: "아빠", name: "김아빠", phone: "010-0000-0000" },
    { role: "엄마", name: "이엄마", phone: "010-0000-0000" }
  ],

  accounts: [
    { label: "아빠 계좌", bank: "행복은행", number: "000-0000-0000", holder: "김아빠" },
    { label: "엄마 계좌", bank: "사랑은행", number: "111-1111-1111", holder: "이엄마" }
  ],

  gallery: [
    "assets/images/gallery-01.png",
    "assets/images/gallery-02.png",
    "assets/images/gallery-03.png",
    "assets/images/gallery-04.png",
    "assets/images/gallery-05.png",
    "assets/images/gallery-06.png"
  ],

  footerText: "귀한 걸음으로 함께해 주시면 감사하겠습니다."
};
