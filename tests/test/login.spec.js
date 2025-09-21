import { strict as assert } from 'assert';
import { buildDriver, waitForTestId } from './helpers.js';

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
    await driver.get('http://localhost:5173/');
    const username = await waitForTestId(driver, 'username');
    const password = await waitForTestId(driver, 'password');
    const btn = await waitForTestId(driver, 'login-btn');

    await username.clear();
    await username.sendKeys('test');
    await password.clear();
    await password.sendKeys('password');
    await btn.click();

    // Wait for navigation and dashboard content
    await driver.wait(async () => (await driver.getCurrentUrl()).includes('/app'), 10000);
    const list = await waitForTestId(driver, 'items-list');
    assert.ok(list, 'Items list should be present');
  });
});
