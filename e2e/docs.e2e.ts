import { expect, test } from '@playwright/test';

test('home page lists the docs pages', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'vercel-101', level: 1 })).toBeVisible();
	await expect(page.getByRole('link', { name: /ภาพรวมและของที่ต้องเตรียม/ }).first()).toBeVisible();
});

test('navigating to a doc page renders its markdown', async ({ page }) => {
	await page.goto('/docs/ci');
	await expect(
		page.getByRole('heading', { name: 'บทที่ 3 — ตั้ง CI บน GitHub Actions', level: 1 })
	).toBeVisible();
});

test('a doc page can link to the next chapter', async ({ page }) => {
	await page.goto('/docs/ci');
	await page.getByRole('link', { name: /บทที่ 4/ }).click();
	await expect(page).toHaveURL('/docs/versioning');
});

test('unknown doc slug returns a 404', async ({ page }) => {
	const response = await page.goto('/docs/nope');
	expect(response?.status()).toBe(404);
});
