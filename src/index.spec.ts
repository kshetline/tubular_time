import { expect } from 'chai';
import ttime, {
  addZonesUpdateListener, clearZonesUpdateListeners, DateTime, getTimezones, initTimezoneSmall,
  pollForTimezoneUpdates, Timezone
} from './index';
import timezoneSmall from './timezone-small';
import timezoneLarge from './timezone-large';
import { zonePollerNode } from './zone-poller-node';

describe('Zone updates', () => {
  beforeEach(() => {
    DateTime.setDefaultLocale('en-us');
    DateTime.setDefaultTimezone('America/New_York');
  });

  it('should retrieve remote timezone updates', function (done) {
    this.slow(3000);
    this.timeout(10000);

    addZonesUpdateListener(result => {
      clearZonesUpdateListeners();
      expect(typeof result === 'boolean').to.be.true;
      done();
    });

    pollForTimezoneUpdates(zonePollerNode);
  });

  it('should fail to retrieve remote timezone update', function (done) {
    this.slow(3000);
    this.timeout(10000);

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
    this.timeout(10000);

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
    expect(ttime().utcTimeMillis).approximately(Date.now(), 1000);
    expect(ttime('1945-05-08').utcTimeMillis).to.equal(Date.parse('May 8, 1945'));
    expect(ttime('May 8, 1945', 'MMM D, Y').utcTimeMillis).to.equal(Date.parse('May 8, 1945'));
    expect(ttime('8/5/1945', 'IS', 'es').format('IM')).to.equal('8 may. 1945');
    expect(ttime('8/5/45', 'IS', 'es').format('IM')).to.equal('8 may. 2045');
  });

  it('should recognize Date and DateTime classes', () => {
    expect(ttime.isDateTime(ttime())).to.be.true;
    expect(ttime.isDateTime(5)).to.be.false;
    expect(ttime.isDate(new Date())).to.be.true;
    expect(ttime.isDate('kitten')).to.be.false;
  });
});
