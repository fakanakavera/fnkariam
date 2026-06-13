export interface CityMemo {
  cityId: string;
  cityName: string;
  coords: string;
  owner: string;
  memo: string;
  lastUpdated: number;
}

export const CITY_MEMOS_STORAGE_KEY = 'cityMemos';
