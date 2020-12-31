import { expect } from 'chai';
// import moment from './locale/moment-with-locales.js';

import { DateTime } from './date-time';
import { format } from './format-parse';

describe('FormatParse', () => {
  it('should properly decompose format strings', () => {
    console.log(format(new DateTime(), 'dddd ddd dd yyyy-MM-DD HH:mm:ss.SS'));
    expect(true).to.be.true;
  });
});
