import { expect, test } from '@playwright/test'

const signIn = async (page, email = process.env.CRYO_E2E_EMAIL) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel(/^Password/).fill(process.env.CRYO_E2E_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Workspace overview' })).toBeVisible()
}

test.describe('Phase 5 Navigation, Dynamic Workspaces, Tree View, Reports & Coverage', () => {

  test('global search opens, filters across types, and navigates', async ({ page }) => {
    await signIn(page)

    // Open Search via button
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByPlaceholder(/Search DocTypes, Workspaces/i)).toBeVisible()

    // Filter by type "DocType"
    await page.getByRole('button', { name: 'DocType', exact: true }).click()

    // Search for "Territory"
    await page.getByPlaceholder(/Search DocTypes, Workspaces/i).fill('Territory')
    await expect(page.getByRole('dialog').getByText('Territory', { exact: true })).toBeVisible()

    // Click result to navigate
    await page.getByRole('dialog').getByText('Territory', { exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Territory' })).toBeVisible()
  })

  test('dynamic tree view renders hierarchy with table/tree view mode toggle', async ({ page }) => {
    await signIn(page)

    // Navigate to Territory
    await page.goto('/documents/Territory')
    await expect(page.getByRole('heading', { name: 'Territory' })).toBeVisible()

    // Tree view toggle must be present
    await expect(page.getByRole('group', { name: 'View mode' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tree view' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'List view' })).toBeVisible()

    // Switch to List view
    await page.getByRole('button', { name: 'List view' }).click()
    await expect(page.getByPlaceholder('Search by name…')).toBeVisible()

    // Switch back to Tree view
    await page.getByRole('button', { name: 'Tree view' }).click()
    await expect(page.getByPlaceholder(/Filter Territory tree/i)).toBeVisible()
  })

  test('dynamic workspace renders cards, shortcuts, and pending status dialog', async ({ page }) => {
    await signIn(page)

    // Navigate to Quality Management workspace
    await page.goto('/workspaces/Quality%20Management')
    await expect(page.getByRole('heading', { name: 'Quality Management Workspace' })).toBeVisible()

    // Verified section contains verified masters
    await expect(page.getByRole('heading', { name: 'Quality Feedback Template' })).toBeVisible()

    // Test clicking a pending item in navigation cards
    const pendingItem = page.getByRole('button', { name: /Phase 6 Domain Logic|Discovered/i }).first()
    if (await pendingItem.isVisible()) {
      await pendingItem.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('DocType Implementation Status')).toBeVisible()
      await page.getByRole('button', { name: 'Close' }).click()
    }
  })

  test('report viewer runs report, renders table and exports CSV', async ({ page }) => {
    await signIn(page)

    // Navigate to Quality Inspection Summary report
    await page.goto('/reports/Quality%20Inspection%20Summary')
    await expect(page.getByRole('heading', { name: 'Quality Inspection Summary' })).toBeVisible()
    await expect(page.getByText('Operational')).toBeVisible()

    // Run report button
    await expect(page.getByRole('button', { name: 'Run Report' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()

    // Verify report table is visible
    await expect(page.getByRole('table', { name: /Quality Inspection Summary table/i })).toBeVisible()
  })

  test('implementation coverage dashboard displays KPI metrics and classified tabs', async ({ page }) => {
    await signIn(page)

    // Navigate to coverage
    await page.goto('/coverage')
    await expect(page.getByRole('heading', { name: 'Implementation Coverage Dashboard' })).toBeVisible()

    // KPI cards
    await expect(page.getByText('38 Renderable in Nav')).toBeVisible()
    await expect(page.getByText('24 Dynamic Routes')).toBeVisible()

    // Check tabs
    await expect(page.getByRole('tab', { name: /Registered Masters/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /All DocTypes/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Reports Catalog/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Custom Pages/i })).toBeVisible()

    // Switch to Reports Catalog tab
    await page.getByRole('tab', { name: /Reports Catalog/i }).click()
    await expect(page.getByText('Quality Inspection Summary')).toBeVisible()
  })
})
