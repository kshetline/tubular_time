// Add fields missing from provided type definition
declare namespace Intl {
  interface DateTimeFormatOptions {
    calendar?: string;
    dateStyle?: string;
    dayPeriod?: string;
    hourCycle?: string;
    timeStyle?: string;
  }
}
