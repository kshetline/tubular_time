import { expect } from 'chai';
import ttime, {
  addZonesUpdateListener, clearZonesUpdateListeners, DateTime, getStartOfWeek, getTimezones, getWeekend, initTimezoneSmall,
  pollForTimezoneUpdates, Timezone
} from './index';
import timezoneSmall from './timezone-small';
import timezoneLarge from './timezone-large';
import { zonePollerNode } from './zone-poller-node';
import { newDateTimeFormat } from './format-parse';

describe('Zone updates', () => {
  beforeEach(() => {
    DateTime.setDefaultLocale('en-us');
    DateTime.setDefaultTimezone('America/New_York');
  });

  it('should retrieve remote timezone updates', function (done) {
    this.slow(3000);
    this.timeout(61000);

    addZonesUpdateListener(result => {
      clearZonesUpdateListeners();
      expect(typeof result === 'boolean').to.be.true;
      done();
    });

    pollForTimezoneUpdates(zonePollerNode);
  });

  xit('should fail to retrieve remote timezone update', function (done) {
    this.slow(3000);
    this.timeout(61000);

    addZonesUpdateListener(result => {
      clearZonesUpdateListeners();
      expect(result instanceof Error).to.be.true;
      done();
    });

    // Force bad time zones name
    pollForTimezoneUpdates(zonePollerNode, 'qqq' as any);
  });

  it('should retrieve one-off remote timezone update', function (done) {
    this.slow(3000);
    this.timeout(61000);

    getTimezones(zonePollerNode, 'large')
      .then(result => {
        expect(typeof result === 'boolean').to.be.true;
        done();
      })
      .catch(() => {
        expect(false).to.be.true;
      });
  });

  it('should detect timezone changes', function () {
    initTimezoneSmall();
    expect(Timezone.defineTimezones(timezoneSmall)).to.be.false;
    expect(Timezone.defineTimezones(timezoneLarge)).to.be.true;
  });

  it('should provide alternate access to DateTime instance creation and parsing', () => {
    initTimezoneSmall();
    expect(ttime().epochMillis).approximately(Date.now(), 1000);
    expect(ttime([]).epochMillis).approximately(Date.now(), 1000);
    expect(ttime({}).epochSeconds).approximately(Date.now() / 1000, 2);
    expect(ttime('Europe/Prague').getTimezoneDisplayName()).to.match(/^CES?T$/);
    expect(ttime('1945-05-08 UTC').epochMillis).to.equal(Date.parse('May 8, 1945 00:00+00:00'));
    expect(ttime('May 8, 1945 UTC', 'MMM D, Y z').epochMillis).to.equal(Date.parse('May 8, 1945 00:00+00:00'));
    expect(ttime('8/5/1945', 'IS', 'es').format('IM')).to.match(/^8 may\.? 1945$/);
    expect(ttime('8/5/45', 'IS', 'es').format('IM')).to.match(/^8 may\.? 2045$/);
    expect(ttime('2/5/1955 03:12 am', 'ISS').format('LLLL')).to.equal('Saturday, February 5, 1955 at 3:12 AM');
    expect(ttime('2/5/1955 03:12 am', 'ISS').format('llll')).to.equal('Sat, Feb 5, 1955, 3:12 AM');
    expect(ttime('2/5/1955 03:12 am', 'ISS').format('LLL')).to.equal('February 5, 1955 at 3:12 AM');
    expect(ttime([1955, 2, 5, 3, 12]).format('lll')).to.equal('Feb 5, 1955, 3:12 AM');
    expect(ttime('2/5/1955 03:12 am', 'ISS').format('LL')).to.equal('February 5, 1955');
    expect(ttime('2/5/1955 03:12 am', 'ISS').format('ll')).to.equal('Feb 5, 1955');
    expect(ttime('2/5/1955 03:12 am', 'ISS').format('L')).to.equal('02/05/1955');
    expect(ttime('2/5/1955 03:12 am', 'ISS').format('l')).to.equal('2/5/1955');
    expect(ttime('2/5/1955 03:12:27 am', 'ISM').format('LTS')).to.equal('3:12:27 AM');
    expect(ttime('2/5/1955 03:12:27 am', 'ISM').format('LT')).to.equal('3:12 AM');
    expect(ttime({ year: 2008, month: 1, day: 20, hour: 12, minute: 0 }).toString()).to.equal('DateTime<2008-01-20T12:00:00.000 -05:00>');
    expect(ttime('1945-05-08').toLocale('no').format('lll')).to.equal('8. mai 1945, 0:00');
    expect(ttime('1945-05-08', null, 'no').format('lll')).to.equal('8. mai 1945, 0:00');
    expect(ttime('20210203T2115').toLocale('de').format('ddd MMM D, y N [at] h:mm A z')).to.equal('Mi 02 3, 2021 n. Chr. at 9:15 PM GMT-5');
    expect(ttime({ n: 40 }).format('l')).to.equal('2/10/1970');
    expect(ttime({ y: 2021, dy: 40 }).format('l')).to.equal('2/9/2021');
  });

  it('should recognize Date and DateTime classes', () => {
    expect(ttime.isDateTime(ttime())).to.be.true;
    expect(ttime.isDateTime(5)).to.be.false;
    expect(ttime.isDate(new Date())).to.be.true;
    expect(ttime.isDate('kitten')).to.be.false;
  });

  it('should find min/max DateTime instances, and sort them', () => {
    const a = ttime('1649-11-25');
    const b = ttime('1821-06-07');
    const c = ttime('1898-08-20');
    const d = ttime('1873-01-28');

    expect(ttime.min()).to.be.undefined;
    expect(ttime.min(a, b, c, d)).to.equal(a);
    expect(ttime.max(a, b, c, d)).to.equal(c);
    expect(ttime.sort([a, b, c, d])).to.eql([a, b, d, c]);
    expect(ttime.sort([a, b, c, d], true)).to.eql([c, d, b, a]);
  });

  it('should be able to create DateTimeFormat instances without dateStyle/timeStyle exceptions', () => {
    expect(() => newDateTimeFormat('fr', { timeStyle: 'short', hour: '2-digit' } as any)).to.not.throw();

    const options = newDateTimeFormat('en-US', { dateStyle: 'short', era: 'short' } as any).resolvedOptions();

    expect(options.era).to.equal('short');
    expect((options as any).dateStyle).to.be.undefined;
    expect(options.day).to.match(/^(2-digit|numeric)$/);
  });

  it('should properly determine week starts and weekends', () => {
    expect(getStartOfWeek('en-us')).to.equal(0);
    expect(getStartOfWeek('en-gb')).to.equal(1);
    expect(getStartOfWeek('ar-eg')).to.equal(6);
    expect(getWeekend('en')).to.eql([6, 0]);
    expect(getWeekend('ar-eg')).to.eql([5, 6]);
    expect(getWeekend('sd')).to.eql([5]);
  });
});
