/**
 * One-time Garmin login for the automated sync's dedicated browser profile.
 * Usage: node scripts/garmin-sync/setup-login.mjs
 */

import { join } from 'path'
import { chromium } from 'playwright'

const PROFILE_DIR = join(process.env.LOCALAPPDATA, 'BatchBurn', 'garmin-profile')

const context = await chromium.launchPersistentContext(PROFILE_DIR, { headless: false })
const page = context.pages()[0] ?? (await context.newPage())
await page.goto('https://connect.garmin.com/modern/activities')

console.log("Log in to Garmin, check 'Remember me', then close the window.")

await new Promise((resolve) => context.on('close', resolve))
console.log(`Saved login to ${PROFILE_DIR}`)
