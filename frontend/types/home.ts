export type TabType = "list" | "ai";

export type FilterKey = "dealType" | "price" | "structure" | "size" | "option";

export type HomeFilters = {
  dealType: string;
  price: string;
  structure: string;
  size: string;
  option: string[];
  region: string;
};

export type PropertyItem = {
  id: number;
  title: string;
  address: string;
  priceText: string;
  sizeText: string;
  imageUrl: string;
  lat: number;
  lng: number;
};
