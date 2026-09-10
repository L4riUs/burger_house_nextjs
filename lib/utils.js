import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = 'VES', locale = 'es-VE') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount, locale = 'es-VE') {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(amount);
}
