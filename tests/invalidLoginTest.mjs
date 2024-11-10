// invalidLoginTest.mjs
import { Builder, By, until } from 'selenium-webdriver';
import { assert } from 'chai';

describe('Expense Tracker Invalid Login Test', function() {
  let driver;
  const TIMEOUT = 10000;

  this.timeout(TIMEOUT);

  before(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  after(async () => {
    await driver.quit();
  });

  it('should show an error message for invalid credentials', async () => {
    await driver.get('http://localhost:3000'); // Replace with your app URL
    await driver.sleep(1000); // Wait for the page to load fully

    // Enter invalid login credentials
    const emailField = await driver.findElement(By.name('Email'));
    await emailField.sendKeys('invalid@example.com');
    await driver.sleep(1000); // Small delay after entering email

    const passwordField = await driver.findElement(By.name('Password'));
    await passwordField.sendKeys('wrongpassword');
    await driver.sleep(1000); // Small delay after entering password

    // Click the login button
    const loginButton = await driver.findElement(By.css('button[type="submit"]'));
    await loginButton.click();
    await driver.sleep(2000); // Wait after clicking login

    // Wait for the error message element to be visible on the page
    const errorMessageSelector = By.xpath("//*[contains(text(), 'Failed to log in: Firebase: Error (auth/invalid-credential).')]");
    const errorMessageElement = await driver.wait(until.elementLocated(errorMessageSelector), TIMEOUT);
    await driver.sleep(1000); // Small delay to let the error message fully render

    // Ensure the error message is displayed and contains the correct text
    const errorMessageText = await errorMessageElement.getText();
    assert.include(errorMessageText, 'Failed to log in: Firebase: Error (auth/invalid-credential).', 'Error message should indicate invalid credentials');
  });
});
