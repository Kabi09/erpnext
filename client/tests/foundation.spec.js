import { expect, test } from '@playwright/test'

const sizes = [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]
const signIn = async (page, email = process.env.CRYO_E2E_EMAIL) => {
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel(/^Password/).fill(process.env.CRYO_E2E_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}
const noOverflow = page => expect.poll(() => page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

test('real login, restore, protected routes, navigation and logout across six viewports', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type()) && !/401/.test(message.text())) errors.push(message.text())
  })
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    await noOverflow(page)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    const heading = await page.getByRole('heading', { name: 'Sign in' }).boundingBox()
    const formButton = await page.getByRole('button', { name: 'Sign in' }).boundingBox()
    expect(heading.y + heading.height).toBeLessThan(formButton.y)
    if (width === 390 || width === 1440) await page.screenshot({ path: testInfo.outputPath('login-' + width + '.png') })
  }

  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Workspace overview' })).toBeVisible()
  await expect(page.getByText('Access verified')).toBeVisible()
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    await noOverflow(page)
    await expect(page.getByRole('heading', { name: 'Browser Test Company' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible()
    const header = await page.getByRole('banner').boundingBox()
    const title = await page.getByRole('heading', { name: 'Workspace overview' }).boundingBox()
    expect(header.y + header.height).toBeLessThan(title.y)
    if (width === 390 || width === 1440) await page.screenshot({ path: testInfo.outputPath('workspace-' + width + '.png') })
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('combobox', { name: 'Company' }).click()
  await page.getByRole('option', { name: 'Second Test Company' }).click()
  await expect(page.getByRole('heading', { name: 'Second Test Company' })).toBeVisible()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Overview' }).click()
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toBeHidden()
  const secondTab = await page.context().newPage()
  try {
    await Promise.all([page.reload(), secondTab.goto('/')])
    await expect(page.getByText('Access verified')).toBeVisible()
    await expect(secondTab.getByText('Access verified')).toBeVisible()
  } finally {
    await secondTab.close()
  }

  await page.goto('/unauthorized')
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  await page.goto('/unknown-path')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  expect(errors).toEqual([])
})

test('shows login failure and checks loading, network error and retry', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.CRYO_E2E_EMAIL)
  await page.getByLabel(/^Password/).fill('wrong password')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.getByLabel(/^Password/)).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('email or password is incorrect')
  let markRequested
  const requested = new Promise(resolve => { markRequested = resolve })
  let release
  const untilReleased = new Promise(resolve => { release = resolve })
  const rejectAccess = async route => {
    markRequested()
    await untilReleased
    await route.abort()
  }
  await page.route('**/companies/*/access', rejectAccess)
  await signIn(page)
  await requested
  await expect(page.getByRole('status')).toContainText('Checking company access')
  release()
  await expect(page.getByRole('alert')).toContainText('The service could not be reached')
  await page.unroute('**/companies/*/access', rejectAccess)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Access verified')).toBeVisible()
})

test('an authenticated user without company membership sees the empty state', async ({ page }) => {
  await page.goto('/')
  await signIn(page, 'unassigned@example.com')
  await expect(page.getByRole('heading', { name: 'No companies assigned' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Company' })).toHaveCount(0)
})
