export interface HomeFilters {
  dealType: string;
  price: string;
  structure: string;
  size: string;
  option: string[];
  region: string;
}

export type FilterKey = keyof HomeFilters;

export interface PropertyItem {
  id: string;
  item_id: number;
  title: string;
  price: string;
  deposit: string;
  monthlyRent: string;
  address: string;
  size: string;
  floor: string;
  images: string[];
  lat: number;
  lng: number;
  structure: string;
  options: string[];
}
