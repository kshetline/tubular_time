// Add fields missing from provided type definition
declare namespace Intl {
  interface DateTimeFormatOptions {
    dateStyle?: string;
    timeStyle?: string;
    dayPeriod?: string;
  }
}
