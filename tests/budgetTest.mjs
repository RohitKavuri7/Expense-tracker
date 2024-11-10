import pkg from 'selenium-webdriver';
const { Builder, By, until } = pkg;  
import { assert } from 'chai';

const TIMEOUT = 10000;

describe('Expense Tracker Budget Setting Test', function() {
  this.timeout(TIMEOUT);
  let driver;

  before(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  after(async () => {
    await driver.quit();
  });

  it('should set the budget successfully', async function() {
    this.timeout(30000); // Increase timeout for this specific test

    console.log('Navigating to budget setting page...');
    await driver.get('http://localhost:3000');

    // Log in
    console.log('Logging in...');
    await driver.findElement(By.name('Email')).sendKeys('raj@gmail.com');
    await driver.findElement(By.name('Password')).sendKeys('Rohitkavuri@1234');
    await driver.findElement(By.css('button[type="submit"]')).click();
    await driver.sleep(1000); // Wait for the page to load fully


    // Navigate to Set Budget
    console.log('Navigating to My Budgets...');
    await driver.wait(until.elementLocated(By.linkText('My Budgets')), TIMEOUT);
    await driver.findElement(By.linkText('My Budgets')).click();
    await driver.sleep(1000); // Wait for the page to load fully


    // Set budget
    console.log('Setting the budget...');
    const budgetField = await driver.wait(until.elementIsVisible(driver.findElement(By.css('input[placeholder="Enter Budget Amount"]'))), TIMEOUT);
    await budgetField.sendKeys('500');
    await driver.findElement(By.css('button[type="submit"]')).click();
    await driver.sleep(1000); // Wait for the page to load fully


    // Wait for the alert to be present and then accept it
    console.log('Handling alert...');
    const alert = await driver.wait(until.alertIsPresent(), TIMEOUT);
    const alertText = await alert.getText();  // Get the alert text
    await alert.accept(); // Accept the alert

    // Verify the alert message
    console.log('Verifying budget set message...');
    assert.equal(alertText, 'Budget set successfully!', 'The alert message should be "Budget set successfully!"');

    // Wait for navigation back to homepage (if applicable)
    await driver.wait(until.urlIs('http://localhost:3000/'), TIMEOUT); // Adjust this URL based on your app's homepage
  });
});
