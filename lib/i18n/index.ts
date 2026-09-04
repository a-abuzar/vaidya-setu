import { SupportedLanguage } from '@/lib/types';
import { en, hi, ta } from './dictionaries';

type DeepStringRecord<T> = {
  [P in keyof T]: T[P] extends string ? string : DeepStringRecord<T[P]>;
};

export type Dictionary = DeepStringRecord<typeof en>;
export type DictionaryKey = keyof Dictionary;

export function getDictionary(lang: SupportedLanguage): Dictionary {
  switch (lang) {
    case 'en':
      return en;
    case 'hi':
      return hi;
    case 'ta':
      return ta;
    default:
      return en;
  }
}
