import { expect, test } from '@playwright/test'

const sizes = [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]

const signIn = async (page, email = process.env.CRYO_E2E_EMAIL) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel(/^Password/).fill(process.env.CRYO_E2E_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Workspace overview' })).toBeVisible()
}

const noOverflow = page => expect.poll(() => page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

test.describe('Metadata-driven React MUI Document Engine', () => {

  test('complete vertical integration for Quality Inspection Parameter Group, Parameter and Feedback Template', async ({ page }) => {
    await signIn(page)

    // 1. Dynamic Navigation & Sidebar verification
    await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Stock Workspace' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Quality Inspection Parameter Group' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Quality Inspection Parameter', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Quality Feedback Template' })).toBeVisible()

    // 2. Navigate to Stock Workspace
    await page.getByRole('link', { name: 'Stock Workspace' }).click()
    await expect(page.getByRole('heading', { name: 'Stock Workspace' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quality Inspection Parameter Group' })).toBeVisible()
    await expect(page.getByText('Phase 5 Workspace Modules')).toBeVisible()

    // 3. Quality Inspection Parameter Group: List, Required validation, Create, Persistence
    await page.getByRole('link', { name: 'Quality Inspection Parameter Group' }).first().click()
    await expect(page.getByRole('heading', { name: 'Quality Inspection Parameter Group' })).toBeVisible()
    await expect(page.getByText('No documents found')).toBeVisible()

    // Click "New Quality Inspection Parameter Group"
    await page.getByRole('link', { name: 'New Quality Inspection Parameter Group' }).click()
    await expect(page.getByRole('heading', { name: 'New Quality Inspection Parameter Group' })).toBeVisible()

    // Test required field pre-submit validation (helper text + validation summary)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Parameter Group Name is required', { exact: true })).toBeVisible()
    await expect(page.getByRole('alert').getByText(/Parameter Group Name/)).toBeVisible()

    // Enter name "Dimensions" and submit
    await page.getByRole('textbox', { name: 'Parameter Group Name' }).fill('Dimensions')
    await page.getByRole('button', { name: 'Save' }).click()

    // Should redirect to detail view
    await expect(page.getByRole('heading', { name: 'Dimensions' })).toBeVisible()
    await expect(page.getByText('Draft')).toBeVisible()

    // Reload page to verify persistence
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Dimensions' })).toBeVisible()
    await expect(page.getByText('Audit Information')).toBeVisible()

    // Test duplicate name error
    await page.goto('/documents/Quality%20Inspection%20Parameter%20Group/new')
    await page.getByRole('textbox', { name: 'Parameter Group Name' }).fill('Dimensions')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/already exists/i).first()).toBeVisible()

    // 4. Quality Inspection Parameter: LinkedDocumentSelector, Create, Reference delete guard
    await page.goto('/documents/Quality%20Inspection%20Parameter/new')
    await expect(page.getByRole('heading', { name: 'New Quality Inspection Parameter' })).toBeVisible()

    await page.getByRole('textbox', { name: 'Parameter', exact: true }).fill('Diameter')
    await page.getByRole('textbox', { name: 'Description' }).fill('Measure the outer diameter.')

    // Autocomplete LinkedDocumentSelector
    await page.getByRole('combobox', { name: 'Parameter Group' }).click()
    await page.getByRole('option', { name: 'Dimensions' }).click()

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Diameter' })).toBeVisible()

    // Reload to verify persistence
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Diameter' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dimensions' })).toBeVisible()

    // Test reference delete restriction on Group
    await page.goto('/documents/Quality%20Inspection%20Parameter%20Group')
    await page.getByRole('button', { name: 'Delete Dimensions' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(/references this record/i).first()).toBeVisible()

    // 5. Test editing Quality Inspection Parameter and Stale-Version Conflict recovery
    await page.goto('/documents/Quality%20Inspection%20Parameter')
    await page.getByRole('link', { name: 'Diameter', exact: true }).click()
    await page.getByRole('button', { name: 'Edit' }).click()

    // Check that immutable field is read only if applicable, and description is editable
    await page.getByRole('textbox', { name: 'Description' }).fill('Measure the outer diameter with digital caliper.')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Document updated successfully.')).toBeVisible()

    // Go into edit mode again
    await page.getByRole('button', { name: 'Edit' }).click()
    const descField = page.getByRole('textbox', { name: 'Description' })
    await descField.fill('My uncommitted edit from Tab A')

    // Simulate concurrent update on the server directly via shared api
    const concurrentUpdated = await page.evaluate(async () => {
      const id = window.location.pathname.split('/')[3]
      const res = await window.__CRYO_API__.get(`/documents/Quality%20Inspection%20Parameter/${id}`)
      const doc = res.data.data
      const patchRes = await window.__CRYO_API__.patch(
        `/documents/Quality%20Inspection%20Parameter/${id}`,
        { fields: { description: 'Concurrent edit from another user' } },
        { headers: { 'If-Match': `"${doc.version}"` } }
      )
      return patchRes.status === 200
    })
    expect(concurrentUpdated).toBe(true)

    // Now try to save the stale form in Tab A
    await page.getByRole('button', { name: 'Save' }).click()

    // Conflict Dialog must appear!
    await expect(page.getByRole('heading', { name: 'Version Conflict Detected' })).toBeVisible()
    await expect(page.getByText(/This document was modified by another user/i)).toBeVisible()

    // Click "Reload Latest Version"
    await page.getByRole('button', { name: 'Reload Latest Version' }).click()
    await expect(page.getByRole('heading', { name: 'Version Conflict Detected' })).toBeHidden()
    await expect(page.getByText('Reloaded latest document from server.')).toBeVisible()
    await expect(page.getByText('Concurrent edit from another user')).toBeVisible()

    // 6. Quality Feedback Template: Dynamic Child Table with add, reorder, remove, validation, persistence
    await page.goto('/documents/Quality%20Feedback%20Template/new')
    await expect(page.getByRole('heading', { name: 'New Quality Feedback Template' })).toBeVisible()

    await page.getByRole('textbox', { name: 'Template Name' }).fill('Product Review Template')

    // Child Table: Add row #1
    await page.getByRole('button', { name: 'Add Row' }).click()
    await page.getByPlaceholder('Parameter').first().fill('Precision')

    // Add row #2
    await page.getByRole('button', { name: 'Add Row' }).click()
    await page.getByPlaceholder('Parameter').nth(1).fill('Surface Finish')

    // Add row #3
    await page.getByRole('button', { name: 'Add Row' }).click()
    await page.getByPlaceholder('Parameter').nth(2).fill('Extra Row')

    // Test row reorder (Move row #2 down)
    await page.getByRole('button', { name: 'Move row down' }).first().click()

    // Test row removal (Remove bottom row)
    await page.getByRole('button', { name: 'Remove row' }).nth(2).click()

    // Test child table duplicate parameter validation
    await page.getByPlaceholder('Parameter').nth(1).fill('Precision')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/validation error|check the submitted fields/i).first()).toBeVisible()

    // Correct row #2
    await page.getByPlaceholder('Parameter').nth(1).fill('Surface Finish')
    await page.getByRole('button', { name: 'Save' }).click()

    // Redirected to detail page
    await expect(page.getByRole('heading', { name: 'Product Review Template' })).toBeVisible()

    // Reload page to verify persistence of child rows
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Product Review Template' })).toBeVisible()
    await expect(page.getByText('Precision')).toBeVisible()
    await expect(page.getByText('Surface Finish')).toBeVisible()

    // 7. Company Switching and Data Isolation
    await page.goto('/documents/Quality%20Inspection%20Parameter%20Group')
    await expect(page.getByText('Dimensions')).toBeVisible()

    // Switch company to Second Test Company
    await page.goto('/')
    await page.getByRole('combobox', { name: 'Company' }).click()
    await page.getByRole('option', { name: 'Second Test Company' }).click()
    await expect(page.getByRole('heading', { name: 'Second Test Company' })).toBeVisible()

    // Data from first company should not leak
    await page.goto('/documents/Quality%20Inspection%20Parameter%20Group')
    await expect(page.getByText('No documents found')).toBeVisible()
    await expect(page.getByText('Dimensions')).toBeHidden()

    // Switch back
    await page.goto('/')
    await page.getByRole('combobox', { name: 'Company' }).click()
    await page.getByRole('option', { name: 'Browser Test Company' }).click()
    await expect(page.getByRole('heading', { name: 'Browser Test Company' })).toBeVisible()

    await page.goto('/documents/Quality%20Inspection%20Parameter%20Group')
    await expect(page.getByText('Dimensions')).toBeVisible()

    // 8. Unregistered DocType handling
    await page.goto('/documents/Sales%20Invoice')
    await expect(page.getByRole('heading', { name: 'DocType Unavailable' })).toBeVisible()
    await expect(page.getByText(/not registered or not permitted/i)).toBeVisible()

    // 9. Responsive layout verification across all 6 viewports
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height })
      await noOverflow(page)
      await expect(page.getByRole('heading', { name: 'Quality Inspection Parameter Group' })).toBeVisible()
    }
  })
})
