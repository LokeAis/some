export interface CompetitorAnalysisData {
  own_summary: string;
  competitors: {
    name_or_url: string;
    summary: string;
    positioning: string;
    main_topics: string[];
  }[];
  similarities?: string[];
  differences?: string[];
  content_gaps: {
    theme: string;
    description: string;
    why_it_matters: string;
    suggested_formats?: string[];
    content_ideas?: string[];
  }[];
}

export interface SiteAnalysisData {
  id?: string;
  url?: string;
  company_summary: string;
  target_audience: string[];
  products_services: string[];
  tone_of_voice: string;
  usp: string[];
  content_pillars: string[];
  cta_suggestions: string[];
  brand_risks_or_gaps: string[];
  golden_nuggets: string[];
  confidence_notes: string;
  competitor_analysis?: CompetitorAnalysisData;
}

export interface MonthPlanItem {
  day: number;
  channel: string;
  theme: string;
  post_goal: string;
  format: string;
  angle: string;
  cta: string;
  notes: string;
  status?: 'draft' | 'ready' | 'published';
}

export interface MonthPlanData {
  id?: string;
  posts: MonthPlanItem[];
  plan_summary: string;
}

export interface SinglePostData {
  id?: string;
  content_type?: 'post' | 'article';
  // Post fields
  channel?: string;
  hook?: string;
  main_caption?: string;
  short_version?: string;
  hashtag_suggestions?: string[];
  alternative_variant?: string;
  // Article fields
  article_title?: string;
  url_slug?: string;
  meta_title?: string;
  meta_description?: string;
  article_body?: string;
  // Shared
  image_prompt: string;
  imageUrl?: string;
  status?: 'draft' | 'ready' | 'published';
}
