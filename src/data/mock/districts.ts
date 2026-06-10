export interface DongSeed {
  dong: string;
  lat: number;
  lng: number;
}

export interface DistrictSeed {
  district: string;
  /** 아파트 평당가 기준 (만원/평) */
  pricePerPyeong: number;
  /** 구 전체 특성 태그 */
  tags: string[];
  dongs: DongSeed[];
}

export const DISTRICTS: DistrictSeed[] = [
  {
    district: "강남구",
    pricePerPyeong: 8500,
    tags: ["학군", "상권"],
    dongs: [
      { dong: "역삼동", lat: 37.5006, lng: 127.0364 },
      { dong: "대치동", lat: 37.4946, lng: 127.0629 },
      { dong: "개포동", lat: 37.4811, lng: 127.0623 },
    ],
  },
  {
    district: "서초구",
    pricePerPyeong: 8200,
    tags: ["학군"],
    dongs: [
      { dong: "서초동", lat: 37.4912, lng: 127.0076 },
      { dong: "반포동", lat: 37.5052, lng: 126.9911 },
      { dong: "방배동", lat: 37.4815, lng: 126.9853 },
    ],
  },
  {
    district: "송파구",
    pricePerPyeong: 6500,
    tags: ["상권"],
    dongs: [
      { dong: "잠실동", lat: 37.5078, lng: 127.0823 },
      { dong: "문정동", lat: 37.485, lng: 127.1222 },
      { dong: "가락동", lat: 37.4954, lng: 127.1185 },
    ],
  },
  {
    district: "마포구",
    pricePerPyeong: 5200,
    tags: ["상권"],
    dongs: [
      { dong: "공덕동", lat: 37.5443, lng: 126.9512 },
      { dong: "상암동", lat: 37.5786, lng: 126.8916 },
      { dong: "망원동", lat: 37.5556, lng: 126.9019 },
    ],
  },
  {
    district: "성동구",
    pricePerPyeong: 5400,
    tags: [],
    dongs: [
      { dong: "성수동", lat: 37.5445, lng: 127.0559 },
      { dong: "옥수동", lat: 37.5405, lng: 127.0179 },
      { dong: "행당동", lat: 37.5577, lng: 127.0292 },
    ],
  },
  {
    district: "영등포구",
    pricePerPyeong: 4800,
    tags: [],
    dongs: [
      { dong: "여의도동", lat: 37.5219, lng: 126.9245 },
      { dong: "당산동", lat: 37.5341, lng: 126.9024 },
      { dong: "문래동", lat: 37.5181, lng: 126.8946 },
    ],
  },
  {
    district: "광진구",
    pricePerPyeong: 4600,
    tags: [],
    dongs: [
      { dong: "광장동", lat: 37.5466, lng: 127.1036 },
      { dong: "자양동", lat: 37.5343, lng: 127.0826 },
      { dong: "구의동", lat: 37.5427, lng: 127.0857 },
    ],
  },
  {
    district: "동작구",
    pricePerPyeong: 4300,
    tags: ["조용한동네"],
    dongs: [
      { dong: "흑석동", lat: 37.5065, lng: 126.9633 },
      { dong: "사당동", lat: 37.4846, lng: 126.9716 },
      { dong: "상도동", lat: 37.4986, lng: 126.9479 },
    ],
  },
  {
    district: "강서구",
    pricePerPyeong: 3400,
    tags: ["조용한동네"],
    dongs: [
      { dong: "마곡동", lat: 37.5602, lng: 126.8253 },
      { dong: "등촌동", lat: 37.5527, lng: 126.8589 },
      { dong: "화곡동", lat: 37.5415, lng: 126.8403 },
    ],
  },
  {
    district: "관악구",
    pricePerPyeong: 2900,
    tags: ["조용한동네"],
    dongs: [
      { dong: "봉천동", lat: 37.4824, lng: 126.9418 },
      { dong: "신림동", lat: 37.4843, lng: 126.9296 },
    ],
  },
  {
    district: "노원구",
    pricePerPyeong: 2800,
    tags: ["학군", "공원", "조용한동네"],
    dongs: [
      { dong: "중계동", lat: 37.6451, lng: 127.0648 },
      { dong: "상계동", lat: 37.6604, lng: 127.0731 },
      { dong: "하계동", lat: 37.6366, lng: 127.0686 },
    ],
  },
  {
    district: "은평구",
    pricePerPyeong: 2700,
    tags: ["공원", "조용한동네"],
    dongs: [
      { dong: "응암동", lat: 37.5985, lng: 126.9156 },
      { dong: "녹번동", lat: 37.6058, lng: 126.9355 },
      { dong: "진관동", lat: 37.6385, lng: 126.9192 },
    ],
  },
];
