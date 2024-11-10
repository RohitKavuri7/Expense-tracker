const { Builder, By, until } = require('selenium-webdriver');
const assert = require('chai').assert;

describe('Expense Tracker Add Expense Test', () => {
  let driver;

  before(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  after(async () => {
    await driver.quit();
  });

  it('should add a new expense', async () => {
    await driver.get('http://localhost:3000/add-expense'); // Adjust to the correct URL

    // Log in first
    await driver.findElement(By.name('Email')).sendKeys('raj@gmail.com');
    await driver.findElement(By.name('Password')).sendKeys('Rohitkavuri@1234');
    await driver.findElement(By.css('button[type="submit"]')).click();

    // Navigate to Add Expense form
    await driver.wait(until.elementLocated(By.linkText('Add Expense')), 10000).click();
    await driver.findElement(By.name('name')).sendKeys('Groceries');
    await driver.findElement(By.name('amount')).sendKeys('50');
    await driver.findElement(By.css('button[type="submit"]')).click();

    // Verify that expense is added in the list
    const expenseName = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Groceries')]")), 10000);
    assert.isTrue(await expenseName.isDisplayed());
  });
});
