## @tubular/time

Not all days are 24 hours. Some are 23 hours, or 25, or even 23.5 or 24.5 or 47. How about a Thursday followed directly by a Saturday, giving Friday the slip? Or a September only 19 days long? This is date/time library that handles both the day-to-day situations (so to speak) and the weird ones too.

### Key features

* Mutable and immutable DateTime objects supporting the Gregorian and Julian calendar systems, with settable crossover.
* IANA timezone support, with features beyond simply parsing and formatting using timezones, including an accessible listing of all available timezones and live updates of timezone definitions.
* Supports and recognizes negative Daylight Saving Time.
* Many features available using a familiar Moment.js-style API.
* Extensive date/time manipulation and calculation capabilities.
* Astronomical time functions.
* Internationalization via JavaScript's `Intl` Internationalization API, with additional built-in i18n support for issues not covered by `Intl`, and US-English fallback for environments without `Intl` support.
* Suitable for tree shaking and Angular optimization.
* Full TypeScript typing support.

<img src="https://shetline.com/readme/tubular-time/2.4.0/oct_1582.jpg" alt="October 1582">
<br>
<img src="https://shetline.com/readme/tubular-time/2.4.0/sep_1752.jpg" alt="September 1752">

**@tubular/time** is a collection of date and time classes and functions, providing extensive internationalized date/time parsing and formatting capabilities, date/time manipulations such as field-specific add/subtract, set, and roll; calendar computations; support for live-updatable IANA time zones; and a settable Julian/Gregorian calendar switchover date.

This library was originally developed for an astronomy website, https://skyviewcafe.com, and has some features of particular interest for astronomy and historical events, but has been expanded to provide many features similar to the now-legacy-status Moment.js.

Unlike Moment.js, IANA timezone handling is built in, not a separate module, with a compact set of timezone data that reaches roughly five years into the past and five years into the future, expanded into the past and future using Daylight Saving Time rules and/or values extracted from `Intl.DateTimeFormat`. Unlike the `Intl` API, the full list of available timezones is exposed, allowing the creation of timezone selection interfaces.

Two alternate large timezone definition sets, of approximately 280K each, are available, each serving slightly different purposes. These definitions can be bundled at compile time, or loaded dynamically at run time. You can also download live updates when the IANA Time Zone Database is updated.

### Installation

#### Via npm

`npm install @tubular/time`

`import ttime, { DateTime,  Timezone`...`} from '@tubular/time';`

...or...

`const { default: ttime, DateTime, Timezone`...`} = require('@tubular/time');`

Documentation examples will assume **@tubular/time** has been imported as above.

#### Via `<script>` tag.
```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large-alt.js"></script>
<script src="https://unpkg.com/@tubular/time/dist/web/index.js"></script>
```

The first script element is an example of optionally loading extended timezone definitions. Such a script element, if used, should precede the `index.js` script.

The package will be available via the global variable `tbTime`. `tbTime.default` is the default function, and other functions and classes will be available on this variable, such as `tbTime.DateTime`, `tbTime.julianDay`, etc.

### Basic usage

While there are a wide range of functions and classes available from **@tubular/time**, the workhorse is the `ttime()` function, which produces immutable instances of the `DateTime` class.

`function ttime(initialTime?: number | string | DateAndTime | Date | number[] | null, format?: string, locale?: string | string[]): DateTime`

#### Creating immutable `DateTime` instances with `ttime()`

`DateTime` instances can be created in many ways. The simplest way is to create a current-time instance, done by passing no arguments at all. Dates and times can also be expressed as strings, objects, and arrays of numbers.

|  |  | .toString() |
|---|---|---|
| `ttime()` | Current time | `DateTime<2021‑01‑28T03:29:12.040 ‑05:00>` |
| `ttime('1969‑07‑12T20:17')`<br>`ttime('1969‑07‑12T20:17Z')`<br>`ttime('20210704T0945-03')`<br>`ttime('2021‑W04‑4')` | DateTime from an ISO-8601 date/time string.<br>The trailing `Z` causes the time to be parsed as UTC. Without it, your default timezone is assumed. | `DateTime<1969‑07‑12T20:17:00.000 ‑04:00§>`<br>`DateTime<1969-07-12T20:17:00.000 +00:00>`<br>`DateTime<2021-07-04T09:45:00.000 -03:00>`<br>`DateTime<2021-01-28T00:00:00.000 -05:00>`
| `ttime('2021-w05-5')` | DateTime from an ISO-8601-like date/time variant for locale-based week numbering | `DateTime<2021-01-28T00:00:00.000 -05:00>` |
| `ttime('2017‑03‑02 14:45 Europe/Paris')` | From an ISO-8601 date/time (variant with space instead of `T`) and IANA timezone | `DateTime<2017-03-02T14:45:00.000 +01:00>` |
| `ttime('20:17:15')` | Dateless time from an ISO-8601 time string | `'DateTime<20:17:15.000>` |
| `ttime(1200848400000)` | From millisecond timestamp | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime({ y: 2008, m: 1, d: 20, hrs: 12, min: 0 })` | From `DateAndTime` object, short-style field names | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime({ year: 2008, month: 1, day: 20, hour: 12, minute: 0 })` | From `DateAndTime` object, long-style field names | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime([2013, 12, 11, 10, 9, 8, 765])` | From numeric array: year, month, day, (hour (0-23), minute, second, millisecond), in that order. | `DateTime<2013-12-11T10:09:08.765 -05:00>` |
| `ttime(new Date(2008, 0, 20, 12, 0))` | From JavaScript `Date` object | `DateTime<2008-01-20T12:00:00.000 -05:00>` |
| `ttime('Feb 26 2021 11:00:00 GMT‑0500')` | ECMA-262 string<br>(Parsing performed by JavaScript `Date('`*time_string*`')`) | `DateTime<2021-02-26T11:00:00.000 ‑05:00>` |

### Formatting output

Dates and times can be formatted in a many ways, using a broad selection of format tokens, described in the table below.

For the greatest adherence to localized formats for dates and times, you can use the I*XX* format strings, which directly call upon `Intl.DateTimeFormat` (if available) to created localized dates, times, and combined dates/times.

You can also produce more customized, flexible formatting, specifying the order, positioning, and style (text vs. number, fully spelled out or abbreviated, with or without leading zeros) of each date/time field, with embedded punctuation and text as desired.

For example:

`ttime().format('ddd MMM D, y N [at] h:mm A z')` →<br>
`Wed Feb 3, 2021 AD at 8:59 PM EST`

`ttime().toLocale('de').format('ddd MMM D, y N [at] h:mm A z')` →<br>
`Mi 02 3, 2021 n. Chr. at 9:43 PM GMT-5`

### Format string tokens

| | Token | Output |
|-------|------:|-------|
| Era | NNNNN<br>NNN,&nbsp;NN,&nbsp;N | BC AD<br><br>Abbreviated era (no distinction between narrow and abbreviated). |
| | NNNN | Before Christ, Anno Domini<br><br>Long-form era.
| | n | BC<br><br>Abbreviated era, only shows BC, not AD. When AD, leading space before `n` token is removed. |
| Year | YYYYYY | -001970 -001971 ... +001907 +001971<br><br>Always-signed years, padded to six digits |
| | YYYY | 1970 1971 ... 2029 2030<br><br>Padded to at least four digits. |
| | YY | 70 71 ... 29 30 |
| | Y | 1970 1971 ... 9999 +10000 +10001<br><br>Padded to at least four digits, `+` sign shown when over 9999. |
| | y | 1 2 ... 2020 ...<br>Era year, for use with BC/AD, never 0 or negative. |
| Week year (ISO) | GGGG | 1970 1971 ... 2029 2030 |
| | GG | 70 71 ... 29 30 |
| Week year (locale) | gggg | 1970 1971 ... 2029 2030 |
| | gg | 70 71 ... 29 30 |
| Quarter | Qo | 1st 2nd 3rd 4th |
| | Q | 1 2 3 4 |
| Month | MMMM | January February ... November December |
| | MMM | Jan Feb ... Nov Dec |
| | MM | 01 02 ... 11 12 |
| | M | 1 2 ... 11 12 |
| | Mo | 1st 2nd ... 11th 12th |
| Week (ISO) | WW | 01 02 ... 52 53 |
| | W | 1 2 ... 52 53 |
| Week (locale) | ww | 01 02 ... 52 53 |
| | w | 1 2 ... 52 53 |
| Day of month | DD | 01 02 ... 30 31 |
| | D | 1 2 ... 30 31 |
| | Do | 1st 2nd ... 30th 31st |
| Day of year | DDDD | 001 002 ... 364 365 366 |
| | DDD | 1 2 ... 364 365 366 |
| Day of week | dddd | Sunday Monday ... Friday Saturday |
| | ddd | Sun Mon ... Fri Sat |
| | dd | Su Mo ... Fr Sa |
| | d | 0 1 ... 5 6 |
| | do | 0th 1st ... 5th 6th |
| Day of Week (ISO) | E | 1 2 ... 6 7 |
| Day of Week (locale) | e | 1 2 ... 6 7<br><br>Note: this is 1-based, not 0-based, as in Moment.js |
| Hour | HH | 00-23 |
| | H | 0-23 |
| | hh | 01-12, for use with AM/PM |
| | h | 1-12, for use with AM/PM |
| | KK | 00-11, for use with AM/PM |
| | K | 0-11, for use with AM/PM |
| | kk | 01-24 |
| | k | 1-24 |
| Day period | A | AM PM |
| | a | am pm |
| Minute | mm | 00-59 |
| | m | 0-59 |
| Second | ss | 00-59
| | s | 0-59 |
| Fractional seconds | S | 0-9 (tenths of a second) |
| | SS | 00-99 (hundredths of a second) |
| | SSS | 000-999 (milliseconds) |
| | SSSS... | Additional zeros after milliseconds. |
| Timezone | ZZZ | America/New_York, Europe/Paris, etc.<br><br>IANA timezone, if available. |
| | zzz | Australian Central Standard Time, Pacific Daylight Time, etc.<br><br>Long form names, only for output &mdash; cannot be parsed. |
| | ZZ | -0700 -0600 ... +0600 +0700
| | zz,&nbsp;z | EST, CDT, MST, PDT, AEST, etc.<br><br>Please note that timezones in this format are not internationalized, and are not unambiguous when parsed. |
| | Z | -07:00 -06:00 ... +06:00 +07:00
| Unix timestamp | X | 1360013296 |
| Unix millisecond timestamp | x | 1360013296123 |
| Daylight Saving Time indicator | V | § # ^ ~ ❄<br><br>Symbol indicating DST is in effect.<br>This is typically §, meaning the clock has been turned forward one hour.<br># means two hours forward, ^ means half an hour, ~ is any other forward amount.<br>❄ is negative DST, i.e. "Winter Time".<br>Renders one blank space when DST is not in effect. |
| | v | Same as above, but no blank space when DST is not in effect. |
| Occurrence indicator | R | 1:00 , 1:01 ... 1:58 , 1:59 , 1:00₂, 1:01₂ ... 1:58₂, 1:59₂, 2:00 , 2:01<br><br>A subscript 2 (₂) that denotes the second occurrence of the same clock time during a day when clocks are turned back for Daylight Saving Time. |
| | r | Same as above, but no blank space when subscript isn't needed. |

**Moment.js formats not supported by @tubular/time:** DDDo, Wo, wo

**@tubular/time formats not supported by Moment.js:** KK, K, kk, k, ZZZ, V, v, R, r, n, I*XX*

### Moment.js-style localized formats

| | Token | Output |
| -------|------:|------- |
| Month name, day of month, day of week, year, time | LLLL | Thursday, September 4, 1986 8:30 PM |
| | llll | Thu, Sep 4, 1986 8:30 PM |
| Month name, day of month, year, time | LLL | September 4, 1986 8:30 PM |
| | lll | Sep 4, 1986 8:30 PM |
| Month name, day of month, year | LL | September 4, 1986 |
| | ll | Sep 4, 1986 |
| Month numeral, day of month, year | L | 09/04/1986 |
| | l | 9/4/1986 |
| Time with seconds | LTS | 8:30:25 PM |
| Time | LT | 8:30 PM |

### @tubular/time `Intl.DateTimeFormat` shorthand string formats

These start with a capital letter `I`, followed by one letter for the date format, which corresponds to the `dateStyle` option of `Intl.DateTimeFormat`, and one letter for the time format, corresponding to the `timeStyle` option.

The capital letters `F`, `L`, `M`, and `S` correspond to the option values `'full'`, `'long'`, `'medium'`, and `'short'`. `ILS` thus specifies a long style date and a short style time. `IL` is a long style date alone, without time. `IxS` a short style time without a date.

#### Examples

| Format | Output |
|---|---|
| IFF | `Thursday, September 4, 1986 at 8:30:00 PM Eastern Daylight Time` |
| ILM | `September 4, 1986 at 8:30:00 PM` |
| IS | `9/4/86` |
| IxL | `8:30:00 PM EDT` |

### Parsing with a format string, optional locale, with formatted output.

| | .format('IMM') |
|---|---|
| `ttime('02/03/32', 'MM-DD-YY')` | `Feb 3, 2032, 12:00:00 AM` |
| `ttime('02/03/32', 'DD-MM-YY')` | `Mar 2, 2032, 12:00:00 AM` |
| `ttime('02/03/32 4:30 pm', 'DD-MM-YY hh:mm a', 'fr')` | `2 mars 2032 à 16:30:00` |
| `ttime('02/03/32', 'DD-MM-YYYY')` | `2 mars 2032 à 16:30:00` |
| `ttime('2032-03-02T16:30', null, 'ru')` | `2 мар. 2032 г., 16:30:00'` |
| `ttime('2032-03-02T16:30', null, 'ar-sa')` | `٠٢‏/٠٣‏/٢٠٣٢ ٤:٣٠:٠٠ م` |
| `ttime('2032-03-02T16:30', null, 'zh-cn')` | `2032年3月2日 下午4:30:00` |

### The `DateAndTime` object

```json5
{
  y: 2021, // short for year
  m: 2, // short for month
  d: 4, // short for day
  dy: 35, // short for dayOfYear
  n: 18662, // short for epochDay
  j: false, // short for isJulian

  year: 2021,
  month: 2,
  day: 4,
  dayOfYear: 35,
  epochDay: 18662, // days since January, 1 1970
  isJulian: false, // true if a Julian calendar date instead of a Gregorian date

  yw: 2021, // short for yearByWeek
  w: 5, // short for week
  dw: 4, // short for dayOfWeek
  yearByWeek: 2021, // year that accompanies an ISO year/week/day-of-week style date
  week: 5, // week that accompanies an ISO year/week/day-of-week style date
  dayOfWeek: 4, // day that accompanies an ISO year/week/day-of-week style date

  ywl: 2021, // short for yearByWeekLocale
  wl: 6, // short for weekLocale
  dwl: 5, // short for dayOfWeekLocale
  yearByWeekLocale: 2021, // year that accompanies an locale-specific year/week/day-of-week style date
  weekLocale: 6, // week that accompanies an locale-specific year/week/day-of-week style date
  dayOfWeekLocale: 5, // day that accompanies an locale-specific year/week/day-of-week style date

  hrs: 0, // short for hour
  min: 18, // short for minute
  sec: 32, // short for second
  hour: 0,
  minute: 18,
  second: 32,
  millis: 125, // 0-999 milliseconds part of time

  utcOffset: -18000, // offset (in seconds) from UTC, negative west from 0°, including DST offset when applicable
  dstOffset: 0, // DST offset, in minutes - usually positive, but can be negative
  occurrence: 1 // usual 1, but can be 2 for the second occurrence of the same wall clock time during a single day, caused by clock being turned back for DST
}
```

When using a `DateAndTime` object to create a `DateTime` instance, you need only set a minimal number of fields to specify the date and/or time you are trying to specify. You can use short or long names for field (if you use both, the short form takes priority).

At minimum, you must specify a date or a time. If you only specify a date, the time will be treated as midnight at the start of that date. If you only specify a time, you can create a special dateless time instance. You can also, of course, specify both date and time together.

In specifying a date, the date fields have the following priority:

* `n` / `epochDay`: Number of days before/after epoch day 0, which is January 1, 1970.
* `y` / `year`: A normal calendar year. Along with the year, you can specify:
  * Nothing more, in which case the date is treated as January 1 of that year.
  * `m` / `month`: The month (a normal 1-12 month, not the weird 0-11 month the JavaScript `Date` uses!).
    * If nothing more is given, the date is treated as the first of the month.
    * `d` / `day`: The date of the month.
  * `dy` / `dayOfYear`: The 1-based number of days into the year, such that 32 means February 1.
* `yw` / `yearByWeek`: An ISO week-based calendar year, where each week starts on Monday. This year is the same as the normal calendar year for most of the calendar year, except for, possibly, a few days at the beginning and end of the year. Week 1 is the first week that contains January 4. Along with this style of year, you can specify:
    * Nothing more, in which case the date is treated as the first day of the first week of the year.
    * `w` / `week`: The 1-based week number.
      * If nothing more, the date is treated as the first day of the given week.
      * `dw` / `dayOfWeek`: The 1-based day of the given week.
* `ywl` / `yearByWeekLocale`, etc: These fields work the same as `yw` / `yearByWeek`, etc., except that they apply to locale-specific rules for the day of the week on which each week starts, and for the definition of the first week of the year.

In specifying a time, the minimum needed is a 0-23 value for `hrs` / `hour`. All other unspecified time fields will be treated as 0.

When dealing Daylight Saving Time, and days when clocks are turned backward, some hour/minute combinations are repeated. The time might be 1:59, go back to 1:00, then forward again to 1:59, and only after hitting 1:59 for this second time during the day, move forward to 2:00.

By default, any ambiguous time is treated as the later, second occurrence of that time during a day. You can, however, use `occurrence: 1` to explicitly specify the earlier time.

As an output from a `DateTime` instance, such as what you get from `ttime().wallTime`, all fields will be filled in with synchronized values.
