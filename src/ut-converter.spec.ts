import { expect } from 'chai';
import {
  DELTA_TDT_SEC, getDeltaTAtTaiMillis, taiDaysToUt, taiToUtMillis, UNIX_TIME_ZERO_AS_JULIAN_DAY, utToTai, utToTaiMillis
} from './ut-converter';
import { DateTime } from './date-time';
import { DAY_MSEC } from './common';

const SIX_MONTHS_DAYS = 180;
const TEST_DTS = [
  22.51, 23.01, 23.46, 23.63, 23.95, 24.39, 24.34, 24.1, 24.02, 23.98,
  23.89, 23.93, 23.88, 23.91, 23.76, 23.91, 23.96, 24.04, 24.35, 24.82,
  25.3, 25.77, 26.27, 26.76, 27.27, 27.77, 28.25, 28.7, 29.15, 29.57,
  29.97, 30.36, 30.72, 31.07, 31.35, 31.68, 32.17, 32.67, 33.15, 33.58,
  33.99, 34.47, 35.03, 35.74, 36.55, 37.43, 38.29, 39.2, 40.18, 41.17,
  42.23, 43.37, 44.48, 45.48, 46.46, 47.52, 48.53, 49.59, 50.54, 51.38,
  52.17, 52.96, 53.79, 54.34, 54.87, 55.32, 55.82, 56.3, 56.86, 57.57,
  58.31, 59.12, 59.98, 60.79, 61.63, 62.3, 62.97, 63.47, 63.83, 64.09,
  64.3, 64.47, 64.57, 64.69, 64.85, 65.15, 65.46, 65.78, 66.07, 66.32,
  66.6, 66.91, 67.28, 67.64, 68.1, 68.59, 68.97, 69.22, 69.36, 69.36
];

describe('UT/TT Converter', () => {
  it('should convert properly between time systems', () => {
    for (let t = UNIX_TIME_ZERO_AS_JULIAN_DAY - 75 * SIX_MONTHS_DAYS; t < UNIX_TIME_ZERO_AS_JULIAN_DAY + 75 * SIX_MONTHS_DAYS; t += SIX_MONTHS_DAYS) {
      const millis = (t - UNIX_TIME_ZERO_AS_JULIAN_DAY) / DAY_MSEC;

      expect(utToTai(taiDaysToUt(t))).to.be.approximately(t, 1E-15);
      expect(utToTaiMillis(taiToUtMillis(millis))).to.be.approximately(millis, 0.001);
    }

    for (let y = 1922; y <= 2021; ++y) {
      const now = new DateTime([y], 'UTC').epochMillis;

      expect((utToTaiMillis(now) - now) / 1000 + DELTA_TDT_SEC).to.be.approximately(TEST_DTS[y - 1922], 0.01);
      expect(getDeltaTAtTaiMillis(now)).to.be.approximately(TEST_DTS[y - 1922], 0.01);
    }
  });
});
