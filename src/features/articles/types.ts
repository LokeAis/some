export interface ArticleData {
  id?: string;
  uid: string;
  brandId: string;
  topic: string;
  outline: string;
  content: string;
  status: 'draft' | 'ready' | 'published';
  createdAt: number;
  updatedAt: number;
}
