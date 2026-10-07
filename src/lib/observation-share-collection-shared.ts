/** Client-safe constants and types. Server I/O lives in observation-share-collection.ts. */

export const SHARE_COLLECTION_MIN_ITEMS = 2;
export const SHARE_COLLECTION_MAX_ITEMS = 20;
export const SHARE_COLLECTION_MAX_PER_USER = 50;

export type OwnerShareCollectionSummary = {
  id: string;
  token: string;
  createdAt: string;
  itemCount: number;
};
