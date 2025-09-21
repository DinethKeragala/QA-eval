import { strict as assert } from 'assert';
import { buildDriver, waitForTestId } from './helpers.js';

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
    await driver.get('http://localhost:5173/');
    const username = await waitForTestId(driver, 'username');
    const password = await waitForTestId(driver, 'password');
    const btn = await waitForTestId(driver, 'login-btn');
    await username.clear();
    await username.sendKeys('test');
    await password.clear();
    await password.sendKeys('password');
    await btn.click();

    await waitForTestId(driver, 'items-list');
    const input = await waitForTestId(driver, 'item-input');
    const addBtn = await waitForTestId(driver, 'add-btn');
    const rand = Math.random().toString(36).slice(2, 8);
    const text = `Item ${rand}`;
    await input.clear();
    await input.sendKeys(text);
    await addBtn.click();

    // Ensure it appears
    const list = await waitForTestId(driver, 'items-list');
    await driver.wait(async () => {
      const html = await list.getAttribute('innerText');
      return html.includes(text);
    }, 10000);
    const html = await list.getAttribute('innerText');
    assert.ok(html.includes(text), 'Newly added item should appear');
  });
});
