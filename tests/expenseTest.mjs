// Add Expense Test - addExpenseTest.mjs
import { Builder, By, until } from 'selenium-webdriver';
import { assert } from 'chai';

describe('Expense Tracker Add Expense Test', function() {
    let driver;

    before(async function() {
        this.timeout(20000);
        driver = await new Builder().forBrowser('chrome').build();
    });

    after(async function() {
        await driver.quit();
    });

    it('should add a new expense', async function() {
        this.timeout(30000); // Increased timeout for this test

        console.log('Navigating to the application...');
        await driver.get('http://localhost:3000');

        // Log in first
        console.log('Entering login credentials...');
        await driver.findElement(By.name('Email')).sendKeys('raj@gmail.com');
        await driver.findElement(By.name('Password')).sendKeys('Rohitkavuri@1234');
        await driver.findElement(By.css('button[type="submit"]')).click();
        await driver.sleep(1000); // Wait for the page to load fully


        // Wait for navigation to the home page
        console.log('Waiting for home page...');
        await driver.wait(until.elementLocated(By.linkText('Add Expense')), 20000);
        await driver.sleep(1000); // Wait for the page to load fully


        // Click on the Add Expense link
        console.log('On home page, navigating to Add Expense form...');
        await driver.findElement(By.linkText('Add Expense')).click();
        await driver.sleep(1000); // Wait for the page to load fully


        // Fill in the expense form
        await driver.wait(until.elementLocated(By.css('input[placeholder="Expense Name"]')), 30000)
            .sendKeys('Groceries');
        await driver.sleep(1000); // Wait for the page to load fully


        await driver.findElement(By.css('input[placeholder="Amount"]')).sendKeys('50');
        await driver.findElement(By.css('select')).sendKeys('Utilities'); // Choose a predefined category
        await driver.findElement(By.css('input[type="date"]')).sendKeys('10-29-2024'); // Date format
        await driver.sleep(1000); // Wait for the page to load fully


        // Submit the form
        await driver.findElement(By.css('button[type="submit"]')).click();

        // Check for alert message after submission
        const alert = await driver.wait(until.alertIsPresent(), 30000);
        const alertText = await alert.getText();
        assert.equal(alertText, 'Expense added successfully!');
        await driver.sleep(1000); // Wait for the page to load fully


        // Accept the alert
        await alert.accept();

       // Verify redirection back to home and check if expense is displayed
        console.log('Waiting for home page after adding expense...');
        await driver.wait(until.urlIs('http://localhost:3000/'), 30000)
            .then(() => console.log('Successfully redirected to the home page.'))
            .catch(err => console.error('Failed to redirect to the home page:', err));

        console.log('Checking if the expense is displayed...');
        const expenseNameElement = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Groceries')]")), 30000)
            .catch(err => console.error('Expense not found:', err));

        if (expenseNameElement) {
            const isDisplayed = await expenseNameElement.isDisplayed();
            assert.isTrue(isDisplayed, 'Expense is not displayed on the home page.');
            console.log('Expense displayed successfully.');
        } else {
            throw new Error('Expense element was not found on the home page.');
        }

    });
});
