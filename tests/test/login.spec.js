const { strict: assert } = require('node:assert');
const { buildDriver, loginDefault, BASE_URL } = require('./helpers');

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
    // Double-check navigation + list element to reduce flakes
    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/app'), 'Should navigate to /app');
    assert.ok(list, 'Items list should be present');
  });
});
