import { strict as assert } from 'assert';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

// Base URL (override with CLIENT_URL env)
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173/';

async function buildDriver() {
  const options = new chrome.Options()
    .addArguments('--headless=new', '--disable-gpu', '--window-size=1280,900')
    .excludeSwitches('enable-logging');
  return await new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

async function waitForTestId(driver, id, timeout = 10000) {
  const locator = By.css(`[data-testid="${id}"]`);
  await driver.wait(until.elementLocated(locator), timeout);
  return driver.findElement(locator);
}

async function loginDefault(driver, { baseUrl = BASE_URL, username = 'test', password = 'password' } = {}) {
  await driver.get(baseUrl);
  const usernameEl = await waitForTestId(driver, 'username');
  const passwordEl = await waitForTestId(driver, 'password');
  const btn = await waitForTestId(driver, 'login-btn');
  await usernameEl.clear();
  await usernameEl.sendKeys(username);
  await passwordEl.clear();
  await passwordEl.sendKeys(password);
  await btn.click();
  await driver.wait(async () => (await driver.getCurrentUrl()).includes('/app'), 10000);
  return await waitForTestId(driver, 'items-list');
}

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
