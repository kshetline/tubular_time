## @tubular/time

### Key features

* Mutable and immutable DateTime objects supporting the Gregorian and Julian calendar systems, with settable crossover.
* IANA timezone support, with features beyond simply parsing and formatting using timezones, including live updates.
* Many features available using a familiar Moment.js-style interface.
* Extensive date/time manipulation and calculation capabilities.
* Astronomical time functions.
* Internationalization via `Intl`, with additional built-in i18n support for issues not covered by `Intl`, and US-English fallback for environments without `Intl` support.
* Suitable for tree shaking.
* Full TypeScript typing support.

**@tubular/time** is a collection of date and time classes and functions, providing extensive internationalized date/time parsing and formatting capabilities, date/time manipulations such as field-specific add/subtract, set, and roll; calendar computations; support for live-updatable IANA time zones; and a settable Julian/Gregorian calendar switchover date.

This library was originally developed for an astronomy website, https://skyviewcafe.com, and has some features of particular interest for astronomy and historical events, but has been expanded to provide many features similar to the now-legacy-status Moment.js.

Unlike Moment.js, IANA timezone handling is built in, not a separate module, with a compact set of timezone data that reaches roughly five years into the past and five years into the future, and indefinitely further into the future where generally stable Daylight Saving Time rules apply. Unlike the `Intl` API, the full list of available timezones is exposed, allowing the creation of timezone selection interfaces.

Two alternate large timezone definition sets, of approximately 280K each, are available, each serving slightly different purposes. Each can be bundled at compile time, or loaded dynamically at run time. You can also download live updates when the IANA Time Zone Database is updated.

### Installation

#### Via npm

`npm install @tubular/time`

```typescript
import ttime, { DateTime,  Timezone } from '@tubular/time';
```
...or...
```javascript
const { default: ttime, DateTime, Timezone } = require('@tubular/time');
```

#### Via `<script>` tag.
```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large-alt.js"></script>
<script src="https://unpkg.com/@tubular/time/dist/web/index.js"></script>
```

The first script element is an example of optionally loading extended timezone definitions. Such a script element, if used, should precede the `index.js` script.

The package will be available via the global variable `tbTime`. `tbTime.default` is the default function, and other functions an classes will be available on this variable, such as `tbTime.DateTime`, `tbTime.julianDay`, etc.

| | Token | Output |
| -------|------:|------- |
| Era | NNNNN<br>NNN,&nbsp;NN,&nbsp;N | BC AD<br><br>Abbreviated era (no distinctions between narrow and abbreviated). |
| | n | BC<br><br>Abbreviated era, only shows BC, not AD. When AD, leading space before `n` token is removed. |
| Year | YYYYYY | -001970 -001971 ... +001907 +001971<br><br>Always-signed years, padded to six digits |
| | YYYY | 1970 1971 ... 2029 2030<br><br>Padded to at least four digits. |
| | YY | 70 71 ... 29 30 |
| | Y | 1970 1971 ... 9999 +10000 +10001<br><br>Padded to at least four digits, `+` sign shown when over 9999. |
| | y | 1 2 ... 2020 ...<br>Era year, for use with BC/AD, never 0 or negative. |
| Quarter | Qo | 1st 2nd 3rd 4th |
| | Q | 1 2 3 4 |
| Month | MMMM | January February ... November December |
| | MMM | Jan Feb ... Nov Dec |
| | MM | 01 02 ... 11 12 |
| | M | 1 2 ... 11 12 |
| | Mo | 1st 2nd ... 11th 12th |
| Week (ISO) | WW | 01 02 ... 52 53 |
| | W | 1 2 ... 52 53 |
| | Wo | 1st 2nd ... 52nd 53rd |
| Week (locale) | ww | 01 02 ... 52 53 |
| | w | 1 2 ... 52 53 |
| | wo | 1st 2nd ... 52nd 53rd |
| Day of month | DD | 01 02 ... 30 31 |
| | D | 1 2 ... 30 31 |
| | Do | 1st 2nd ... 30th 31st |
| Day of year | DDDD | 001 002 ... 364 365 366 |
| | DDD | 1 2 ... 364 365 366 |
| Day of week | dddd | Sunday Monday ... Friday Saturday |
| | ddd | Sun Mon ... Fri Sat |
| | dd | Su Mo ... Fr Sa |
| | do | 0th 1st ... 5th 6th |
| | d | 0 1 ... 5 6 |
| Day of Week (ISO) | E | 1 2 ... 6 7 |
| Day of Week (locale) | e | 1 2 ... 6 7<br><br>Note: this is 1-based, not 0-based, as in Moment.js |



**Format not supported by @tubular/time:** DDDo

**Formats not supported by Moment.js:** KK, K, kk, k, ZZZ, V, v, R, r, n, I*XX*
