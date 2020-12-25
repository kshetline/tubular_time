import { expect } from 'chai';
import { addZonesUpdateListener, pollForTimezoneUpdates } from './index';
import { zonePollerNode } from './zone-poller-node';

describe('Zone updates', () => {
  it('should retrieve remote timezone updates', function (done) {
    this.slow(3000);
    this.timeout(10000);

    addZonesUpdateListener(result => {
      expect(result).to.be.true;
      expect(result instanceof Error).to.be.false;
      done();
    });

    pollForTimezoneUpdates(zonePollerNode);
  });
});
