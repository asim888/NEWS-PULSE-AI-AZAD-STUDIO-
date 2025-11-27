
export interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  link: string;
  source: string;
  pubDate: string;
  category: CategoryID;
  imageUrl: string;
}

export type CategoryID = 'azad-studio' | 'hyderabad' | 'telangana' | 'india' | 'international' | 'sports' | 'breaking';

export interface Category {
  id: CategoryID;
  name: string;
  isPremium: boolean;
}

export type LanguageCode = 'en' | 'hi' | 'ur' | 'te' | 'ur-ro';

export interface Language {
  code: LanguageCode;
  name: string;
  voiceName: string; // For TTS
}

export interface Translation {
  lang: LanguageCode;
  text: string;
}
