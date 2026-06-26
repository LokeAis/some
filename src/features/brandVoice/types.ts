export interface BrandVoiceProfile {
  id?: string;
  uid: string;
  brandId: string;
  dos: string[];
  donts: string[];
  referenceTexts: string[];
  summary: string;
  createdAt?: number;
  updatedAt?: number;
}
