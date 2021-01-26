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

#### Via `<script>` tag.
```html
<script src="https://unpkg.com/@tubular/time/dist/data/timezone-large-alt.js"></script>
<script src="https://unpkg.com/@tubular/time/dist/web/index.js"></script>
```
The first script element is an example of optionally loading extended timezone definitions. Such a script element, if used, should precede the `index.js` script.

### Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Running unit tests

Run `npm run test` to execute the unit tests via [Karma](https://karma-runner.github.io).
