export interface ConstructionItem {
  id: string;
  cityId: string;
  cityName: string;
  buildingId: number;
  buildingName: string;
  currentLevel: number;
  targetLevel: number;
  finishTime: number;
  capturedAt: number;
}

export interface StoredConstructionQueue {
  items: ConstructionItem[];
  lastUpdated: number;
}

export const CONSTRUCTION_QUEUE_STORAGE_KEY = 'constructionQueue';
export const CONSTRUCTION_QUEUE_UPDATED_MESSAGE = 'CONSTRUCTION_QUEUE_UPDATED';
export const CONSTRUCTION_ALERT_MINUTES = 5;
