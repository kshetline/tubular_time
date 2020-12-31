import { expect } from 'chai';
// import moment from './locale/moment-with-locales.js';

import { DateTime } from './date-time';
import { format } from './format-parse';

describe('FormatParse', () => {
  it('should properly decompose format strings', () => {
    const date = new DateTime({ y: 2021, m: 1, d: 7, hrs: 8, min: 9, sec: 3 });
    console.log(format(date, 'dddd ddd dd MMMM MMM yyyy-MM-DD (kk) HH:mm:ss.SS X x'));
    console.log(format(date, 'LTS; LT; LLLL; LLL; LL; L; hh:mma'));
    console.log(format(date, 'llll; lll; ll; l'));
    expect(true).to.be.true;
  });
});
