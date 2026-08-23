export const DEFAULT_LOCALE = 'es';
export const SUPPORTED_LOCALES = ['es', 'en'];

export function getLocalizedField(field, locale = DEFAULT_LOCALE) {
  if (!field || typeof field !== 'object') {
    return '';
  }
  return field[locale] || field[DEFAULT_LOCALE] || '';
}

export function getAllLocales(field) {
  if (!field || typeof field !== 'object') {
    return {};
  }
  return {
    es: field.es || '',
    en: field.en || '',
  };
}

export function createLocalizedField(esValue, enValue = '') {
  return {
    es: esValue || '',
    en: enValue || '',
  };
}