import { Builder, By, until } from 'selenium-webdriver';
import { expect } from 'expect';
import chrome from 'selenium-webdriver/chrome.js';

describe('Dashboard UI Test', function () {
  this.timeout(40000);
  /** @type {import('selenium-webdriver').WebDriver} */
  let driver;

  before(async () => {
    const options = new chrome.Options()
      .addArguments(
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,1024'
      );
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    // Log in first
    await driver.get('http://localhost:5173/');
  await driver.findElement(By.id('login-username')).clear();
  await driver.findElement(By.id('login-username')).sendKeys('test');
  await driver.findElement(By.id('login-password')).clear();
  await driver.findElement(By.id('login-password')).sendKeys('password');
    await driver.findElement(By.css('[data-testid="login-btn"]')).click();

  // Wait for the dashboard to load (look for an element unique to it)
  await driver.wait(until.elementLocated(By.css('[data-testid="item-input"]')), 20000);
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('should add an item and display it in the list', async () => {
    const newItemText = 'Test item added by Selenium';

    // Find the input, type in a new item
    await driver.findElement(By.css('[data-testid="item-input"]')).sendKeys(newItemText);
    await driver.findElement(By.css('[data-testid="add-btn"]')).click();

    // Wait for the new item to appear in the list
    const item = await driver.wait(
      until.elementLocated(By.xpath(`//li[contains(., "${newItemText}")]`)),
      10000
    );

  const itemText = await item.getText();
  expect(itemText).toBe(newItemText);
  });
});
