import { create } from "zustand";

type RegisterForm = {
  user_id: number | undefined;
  title: string;
  address: string;
  lat: number;
  lng: number;
  transaction_type: string;
  deposit: number;
  rent: number;
  manage_cost: number | null;
  room_type: string | null;
  floor: string | null;
  all_floors: string | null;
  area_m2: number | null;
  bathroom_count: number | null;
  room_direction: string | null;
  residence_type: string | null;
  approve_date: string | null;
  movein_date: string | null;
  description: string | null;
  has_air_con: boolean;
  has_fridge: boolean;
  has_washer: boolean;
  has_gas_stove: boolean;
  has_induction: boolean;
  has_microwave: boolean;
  has_desk: boolean;
  has_bed: boolean;
  has_closet: boolean;
  has_shoe_rack: boolean;
  has_bookcase: boolean;
  has_sink: boolean;
  has_parking: boolean;
  has_elevator: boolean;
  is_subway_area: boolean;
  is_park_area: boolean;
  is_school_area: boolean;
  is_convenient_area: boolean;
};

type RegisterState = {
  form: RegisterForm | null;
  setForm: (form: RegisterForm) => void;
  clearForm: () => void;
};

export const useRegisterStore = create<RegisterState>((set) => ({
  form: null,
  setForm: (form) => set({ form }),
  clearForm: () => set({ form: null }),
}));