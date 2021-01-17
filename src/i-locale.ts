export interface ILocale {
  name: string;
  months: string[];
  monthsShort: string[];
  weekdays: string[];
  weekdaysShort: string[];
  weekdaysMin: string[];
  cachedTimezone?: string;
  dateTimeFormats: Record<string, string | Intl.DateTimeFormat>;
  meridiem: string[][];
  startOfWeek: number;
  minDaysInWeek: number;
  weekend: number[];
  eras: string[];
  ordinals: string[];
  parsePatterns: Record<string, string>;
  zeroDigit: string;
}
