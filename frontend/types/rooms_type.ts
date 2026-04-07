export interface RoomApiResponse {
  item_id: number;
  title: string | null;
  address: string;
  deposit: number;
  rent: number;
  manage_cost: number | null;
  service_type: string | null;
  room_type: string | null;
  floor: string | null;
  all_floors: string | null;
  area_m2: number | null;
  lat: number;
  lng: number;
  image_thumbnail: string | null;
  url: string | null;
}

export interface RoomListApiResponse {
  items: RoomApiResponse[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}
