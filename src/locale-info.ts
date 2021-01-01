export interface LocaleInfo {
  name: string;
  months: string[];
  monthsShort: string[];
  weekdays: string[];
  weekdaysShort: string[];
  weekdaysMin: string[];
  cachedTimezone?: string;
  dateTimeFormats: Record<string, string | Intl.DateTimeFormat>;
  meridiem : string[][];
}
