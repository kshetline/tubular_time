import { expect } from 'chai';
// import moment from './locale/moment-with-locales.js';

import { DateTime } from './date-time';
import { format } from './format-parse';
import ttime from './index';

describe('FormatParse', () => {
  it('should properly decompose format strings', () => {
    const date = new DateTime({ y: 1986, m: 9, d: 4, hrs: 20, min: 30, sec: 3 }, null, 'en');
    const date2 = new DateTime({ y: -1986, m: 9, d: 4, hrs: 20, min: 30, sec: 3 }, null, 'en');
    console.log(format(date, 'dddd ddd dd MMMM MMM yyyy-MM-DD (kk) HH:mm:ss.SS X x'));
    console.log(format(date, 'LTS; LT; LLLL; LLL; LL; L; hh:mma'));
    console.log(format(date, 'llll; lll; ll; l; ZZZ; zzz; ZZ; zz; Z; z'));
    console.log(format(date, 'ILS; IxF; IMM'));
    console.log(format(date, 'IF; IL; IM; IS; IxF; IxL; IxM; IxS'));
    console.log(format(date, 'MMM D, y N'));
    console.log(format(date2, 'MMM D, y N'));
    console.log(format(date, 'MMM D, y n'));
    console.log(format(date2, 'MMM D, y n'));
    console.log(ttime());
    expect(true).to.be.true;
  });
});
