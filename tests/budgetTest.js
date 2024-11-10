const { Builder, By, until } = require('selenium-webdriver');
const assert = require('chai').assert;

describe('Expense Tracker Budget Setting Test', () => {
  let driver;

  before(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  after(async () => {
    await driver.quit();
  });

  it('should set the budget successfully', async () => {
    await driver.get('http://localhost:3000');

    // Log in
    await driver.findElement(By.name('Email')).sendKeys('raj@gmail.com');
    await driver.findElement(By.name('Password')).sendKeys('Rohitkavuri@1234');
    await driver.findElement(By.css('button[type="submit"]')).click();

    // Navigate to Set Budget
    await driver.findElement(By.linkText('Set Budget')).click();
    await driver.findElement(By.name('budget')).sendKeys('500');
    await driver.findElement(By.css('button[type="submit"]')).click();

    // Verify budget saved
    const budgetMessage = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Budget set successfully')]")), 10000);
    assert.isTrue(await budgetMessage.isDisplayed());
  });
});
