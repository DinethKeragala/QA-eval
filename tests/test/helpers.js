const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { randomBytes } = require('crypto');

async function buildDriver() {
  const options = new chrome.Options()
    .addArguments('--headless=new', '--disable-gpu', '--window-size=1280,900')
    .excludeSwitches('enable-logging');
  return await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
}

async function waitForTestId(driver, id, timeout = 10000) {
  const locator = By.css(`[data-testid="${id}"]`);
  await driver.wait(until.elementLocated(locator), timeout);
  return driver.findElement(locator);
}

const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173/';

async function waitForApi(healthUrl = 'http://localhost:4000/health', attempts = 20, delayMs = 500) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(healthUrl, { method: 'GET' });
      if (res.ok) return true;
    } catch (_) { /* ignore */ }
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

// Removed resolveBaseUrl – we now assume BASE_URL is correct
async function loginDefault(driver, { baseUrl = BASE_URL, username = 'test', password = 'password' } = {}) {
  await waitForApi();
  await driver.get(baseUrl);
  const usernameEl = await waitForTestId(driver, 'username');
  const passwordEl = await waitForTestId(driver, 'password');
  const btn = await waitForTestId(driver, 'login-btn');
  await usernameEl.clear();
  await usernameEl.sendKeys(username);
  await passwordEl.clear();
  await passwordEl.sendKeys(password);
  await btn.click();
  await driver.wait(async () => (await driver.getCurrentUrl()).includes('/app'), 20000);
  return await waitForTestId(driver, 'items-list');
}

function randomHex(bytes = 4) {
  return randomBytes(bytes).toString('hex');
}

module.exports = {
  buildDriver,
  By,
  until,
  waitForTestId,
  BASE_URL,
  loginDefault,
  randomHex,
  waitForApi,
};
