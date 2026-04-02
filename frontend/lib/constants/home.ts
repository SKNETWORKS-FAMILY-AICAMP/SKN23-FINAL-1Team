import { AiImageItem, PropertyItem } from "@/lib/types/home";

export const filterOptions = {
  dealType: ["월세", "전세"],
  price: ["1000/50", "2000/80", "3000/100"],
  structure: ["전체", "오픈형(방1)", "분리형(방1, 거실1)", "복층형"],
  size: ["10평 이하", "10~20평", "20평 이상"],
  option: ["주차", "에어컨", "세탁기", "엘리베이터"],
};

export const propertyList: PropertyItem[] = [
  {
    id: 1,
    title: "독산역 초역세권",
    score: "5/10",
    size: "20평",
    image: "/images/room-sample.png",
  },
  {
    id: 2,
    title: "강남역 초역세권",
    score: "5/10",
    size: "20평",
    image: "/images/room-sample.png",
  },
  {
    id: 3,
    title: "가산디지털단지역 인근",
    score: "4/10",
    size: "18평",
    image: "/images/room-sample.png",
  },
];

export const aiImageList: AiImageItem[] = [
  { id: 1, image: "/images/room-sample.png", selected: true },
  { id: 2, image: "/images/room-sample.png" },
  { id: 3, image: "/images/room-sample.png" },
  { id: 4, image: "/images/room-sample.png" },
];

export const regionList = [
  "가산디지털단지역",
  "서울시 금천구 독산동",
  "서울시 금천구 가산동",
];

export const structureList = [
  "전체",
  "오픈형(방1)",
  "분리형(방1, 거실1)",
  "복층형",
];
