const { strict: assert } = require('node:assert');
const { By } = require('selenium-webdriver');
const { buildDriver, loginDefault, waitForTestId, randomHex, BASE_URL } = require('./helpers');

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
    const list = await loginDefault(driver, { baseUrl: BASE_URL });
    const loggedInUrl = await driver.getCurrentUrl();
    console.log('DEBUG current URL after login:', loggedInUrl);
    const token = await driver.executeScript('return window.localStorage.getItem("token")');
    console.log('DEBUG token length:', token && token.length);
    // Capture initial count to provide a structural wait condition
    const initialItems = await driver.findElements(By.css('[data-testid="item"]'));
    const initialCount = initialItems.length;
    console.log('DEBUG initial item count:', initialCount);

    const input = await waitForTestId(driver, 'item-input');
    const addBtn = await waitForTestId(driver, 'add-btn');
    const text = `Item ${randomHex(4)}`;
    await input.clear();
    await input.sendKeys(text);
    await addBtn.click();
  console.log('DEBUG clicked add, waiting for list growth');

    // First wait for the number of items to increase (structure-based)
    await driver.wait(async () => {
      const items = await driver.findElements(By.css('[data-testid="item"]'));
      return items.length > initialCount;
    }, 30000, 'Timed out waiting for new item count');

    // Then confirm the specific text appears (content-based)
    await driver.wait(async () => {
      const html = await list.getAttribute('innerText');
      return html.includes(text);
    }, 10000, 'Timed out waiting for new item text to appear');

    const finalHtml = await list.getAttribute('innerText');
    if (!finalHtml.includes(text)) {
      console.log('DEBUG final list HTML:', finalHtml);
    }
    assert.ok(finalHtml.includes(text), 'Newly added item should appear');
  });
});
