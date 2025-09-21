import { strict as assert } from 'assert';
import { buildDriver, waitForTestId, loginDefault, randomHex, BASE_URL } from './helpers.js';

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
    const input = await waitForTestId(driver, 'item-input');
    const addBtn = await waitForTestId(driver, 'add-btn');
    const text = `Item ${randomHex(4)}`;
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
