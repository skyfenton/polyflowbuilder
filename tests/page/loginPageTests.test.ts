// NOTE: need ignores bc we need the .ts extension for Playwright
// see https://playwright.dev/docs/test-typescript#typescript-with-esm

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import { createUserAccount, deleteUserAccount, performLogin } from '../util/userTestUtil.ts';

import { expect, test } from '@playwright/test';

const LOGIN_TESTS_EMAIL = 'pfb_test_loginPage_playwright@test.com';

test.describe('login page tests', () => {
  test.beforeAll(async () => {
    // create account
    await createUserAccount(LOGIN_TESTS_EMAIL, 'test', 'test');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.afterAll(async () => {
    // delete account
    await deleteUserAccount(LOGIN_TESTS_EMAIL);
  });

  test('login page has expected h2', async ({ page }) => {
    expect(await page.textContent('h2')).toBe('Sign In');
    await expect(page.locator('button')).toBeVisible();
  });

  test('login fails with blank form', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('input#email:invalid')).toBeVisible();
  });

  test('login fails with only email (improperly formatted)', async ({ page }) => {
    await page.getByLabel('email').fill('test');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('input#email:invalid')).toBeVisible();
  });

  test('login fails with only email (properly formatted)', async ({ page }) => {
    await page.getByLabel('email').fill('test@test.com');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('input#password:invalid')).toBeVisible();
  });

  test('correct email but incorrect password', async ({ page }) => {
    await page.getByLabel('email').fill(LOGIN_TESTS_EMAIL);
    await page.getByLabel('password').fill('notthecorrectpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toHaveText(
      'Incorrect email address and/or password.'
    );
  });

  test('incorrect email but correct password', async ({ page }) => {
    await page.getByLabel('email').fill('nonexistentemail@test.com');
    await page.getByLabel('password').fill('test');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toHaveText(
      'Incorrect email address and/or password.'
    );
  });

  test('correct credentials, check redirect and cookie', async ({ page }) => {
    await performLogin(page, LOGIN_TESTS_EMAIL, 'test');

    await expect(page).toHaveURL(/.*flows/);
    expect(await page.textContent('h2')).toBe('Flows');

    expect((await page.context().cookies())[0].name).toBe('sId');
  });

  test('500 case with correct credentials', async ({ page }) => {
    // mock 500 invalid response
    await page.route('/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: String.raw`{"type":"failure","status":500,"data":"[{\"error\":1},true]"}`
      });
    });

    await page.getByLabel('email').fill(LOGIN_TESTS_EMAIL);
    await page.getByLabel('password').fill('test');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toHaveText(
      'An error occurred when attempting login. Please try again a bit later.'
    );
  });
});