export interface BrandVoiceProfile {
  id?: string;
  uid: string;
  brandId: string;
  dos: string[];
  donts: string[];
  referenceTexts: string[];
  summary: string;
  // Strukturerte stemme-attributt, ekstraherte frå tekst/URL via /api/analyze-brand-voice.
  // Alle valfrie for bakoverkompat med eldre, manuelt utfylte profilar.
  tone?: string;
  vocabulary?: string;
  rhythm?: string;
  forbiddenPhrases?: string[];
  ctaStyle?: string;
  values?: string[];
  createdAt?: number;
  updatedAt?: number;
}
