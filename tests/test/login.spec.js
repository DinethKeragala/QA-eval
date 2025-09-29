import { Builder, By, until } from 'selenium-webdriver';
import { expect } from 'expect';
import chrome from 'selenium-webdriver/chrome.js';

describe('Login UI Test', function () {
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
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('should log in with valid credentials', async () => {
    await driver.get('http://localhost:5173/');

    // Find and interact with the username and password fields
    await driver.findElement(By.id('login-username')).clear();
    await driver.findElement(By.id('login-username')).sendKeys('test');
    await driver.findElement(By.id('login-password')).clear();
    await driver.findElement(By.id('login-password')).sendKeys('password');

    // Click on the login button
    await driver.findElement(By.css('[data-testid="login-btn"]')).click();

  // Wait for the dashboard to load (look for an element unique to it)
  await driver.wait(until.elementLocated(By.css('[data-testid="item-input"]')), 20000);
  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).toContain('/app');
  });
});
