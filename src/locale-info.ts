export interface LocaleInfo {
  months: string[];
  monthsShort: string[];
  weekdays: string[];
  weekdaysShort: string[];
  weekdaysMin: string[];
  longDateFormat: Record<string, string | Intl.DateTimeFormat>;
  meridiem : (hours: number, minutes: number, isLower: boolean) => string
}
