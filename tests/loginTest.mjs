// Login Test - loginTest.mjs
import { Builder, By, until } from 'selenium-webdriver';
import { assert } from 'chai';

describe('Expense Tracker Login Test', () => {
  let driver;

  before(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  after(async () => {
    await driver.quit();
  });

  it('should log in successfully with valid credentials', async () => {
    await driver.get('http://localhost:3000'); // Replace with your app URL
    await driver.findElement(By.name('Email')).sendKeys('raj@gmail.com');
    await driver.findElement(By.name('Password')).sendKeys('Rohitkavuri@1234');
    await driver.findElement(By.css('button[type="submit"]')).click()

    const logoutButton = await driver.wait(until.elementLocated(By.css('.logout-btn')), 10000);
    assert.isTrue(await logoutButton.isDisplayed());
  });
});
