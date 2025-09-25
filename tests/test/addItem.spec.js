import { strict as assert } from 'assert';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { randomBytes } from 'crypto';

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

function randomHex(bytes = 4) {
  return randomBytes(bytes).toString('hex');
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

describe('UI: Add Item flow', function() {
  this.timeout(60000);
  let driver;

  before(async () => {
    driver = await buildDriver();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('adds a new item and sees it in the list', async () => {
    await loginDefault(driver, { baseUrl: BASE_URL });
    const list = await waitForTestId(driver, 'items-list');
    // Capture initial count to provide a structural wait condition
    const initialItems = await driver.findElements(By.css('[data-testid="item"]'));
    const initialCount = initialItems.length;

    const input = await waitForTestId(driver, 'item-input');
    const addBtn = await waitForTestId(driver, 'add-btn');
    const text = `Item ${randomHex(4)}`;
    await input.clear();
    await input.sendKeys(text);
    await addBtn.click();

    // First wait for the number of items to increase (structure-based)
    await driver.wait(async () => {
      const items = await driver.findElements(By.css('[data-testid="item"]'));
      return items.length > initialCount;
    }, 15000, 'Timed out waiting for new item count');

    // Then confirm the specific text appears (content-based)
    await driver.wait(async () => {
      const html = await list.getAttribute('innerText');
      return html.includes(text);
    }, 5000, 'Timed out waiting for new item text to appear');

    const finalHtml = await list.getAttribute('innerText');
    assert.ok(finalHtml.includes(text), 'Newly added item should appear');
  });
});
