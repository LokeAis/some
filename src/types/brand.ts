export interface BrandVoiceProfile {
  id?: string;
  brandId: string;
  dos: string[];
  donts: string[];
  referenceTexts: string[];
  summary: string;
  updatedAt?: number;
}
