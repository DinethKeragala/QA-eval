import { strict as assert } from 'assert';
import { buildDriver, waitForTestId, loginDefault, BASE_URL } from './helpers.js';

describe('UI: Login flow', function() {
  this.timeout(60000);
  let driver;

  before(async () => {
    driver = await buildDriver();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('logs in with default creds and lands on dashboard', async () => {
    const list = await loginDefault(driver, { baseUrl: BASE_URL });
    assert.ok(list, 'Items list should be present');
  });
});
