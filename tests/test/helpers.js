import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { randomBytes } from 'crypto';

export async function buildDriver() {
  const options = new chrome.Options()
    .addArguments('--headless=new', '--disable-gpu', '--window-size=1280,900')
    .excludeSwitches('enable-logging');
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  return driver;
}

export { By, until };

export async function waitForTestId(driver, id, timeout = 10000) {
  const locator = By.css(`[data-testid="${id}"]`);
  await driver.wait(until.elementLocated(locator), timeout);
  return driver.findElement(locator);
}

// Base URL for the client app (override via env if needed)
export const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173/';

// Perform default login flow and wait until dashboard is visible
export async function loginDefault(driver, {
  baseUrl = BASE_URL,
  username = 'test',
  password = 'password',
} = {}) {
  await driver.get(baseUrl);
  const usernameEl = await waitForTestId(driver, 'username');
  const passwordEl = await waitForTestId(driver, 'password');
  const btn = await waitForTestId(driver, 'login-btn');
  await usernameEl.clear();
  await usernameEl.sendKeys(username);
  await passwordEl.clear();
  await passwordEl.sendKeys(password);
  await btn.click();
  // Wait for navigation and dashboard content
  await driver.wait(async () => (await driver.getCurrentUrl()).includes('/app'), 10000);
  return await waitForTestId(driver, 'items-list');
}

// Generate a cryptographically secure random hex string
export function randomHex(bytes = 4) {
  return randomBytes(bytes).toString('hex');
}
