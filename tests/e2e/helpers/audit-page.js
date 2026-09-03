import { expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export async function auditPage(page, { mobile, state = 'ready' }) {
  const main = state === null
    ? page.locator('main')
    : page.locator(`#main-content[data-page-state="${state}"]`)
  await expect(main).toHaveCount(1, { timeout: 15_000 })
  await page.evaluate(async () => {
    await document.fonts?.ready
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  })

  const result = await page.evaluate(({ mobile }) => {
    const visible = (element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0
        && !element.closest('[hidden],[aria-hidden="true"],[inert]')
    }
    const identify = (element) => {
      const className = typeof element.className === 'string' && element.className.trim()
        ? `.${element.className.trim().replaceAll(/\s+/g, '.')}`
        : ''
      return `${element.tagName}${className}`
    }
    const horizontalScrollAncestors = (element) => {
      const ancestors = []
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        if (/(auto|scroll)/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1) ancestors.push(parent)
      }
      return ancestors
    }

    const failures = []
    const root = document.documentElement
    const phone = window.innerWidth < 768
    if (root.scrollWidth > root.clientWidth + 1) {
      failures.push(`document overflow ${root.scrollWidth}/${root.clientWidth}`)
    }
    for (const element of document.body.querySelectorAll('*')) {
      const style = getComputedStyle(element)
      if (/(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1 && !element.hasAttribute('data-horizontal-scroll')) {
        failures.push(`overflow fuera de TableScroller ${identify(element)}`)
      }
    }

    if (mobile) {
      const controls = document.querySelectorAll('a[href],button,.btn,[role="button"],[role="radio"],[role="tab"],[role="menuitem"],summary,select,textarea,input:not([type="hidden"])')
      for (const element of controls) {
        if (!visible(element) || element.matches('.skip-link:not(:focus)')) continue
        const target = ['checkbox', 'radio'].includes(element.type)
          ? element.labels?.[0] || element.closest('label') || element
          : element
        const rect = target.getBoundingClientRect()
        const clipped = rect.left < -1 || rect.right > window.innerWidth + 1
        const scrollAncestors = horizontalScrollAncestors(element)
        if (clipped && !scrollAncestors.some((ancestor) => ancestor.hasAttribute('data-horizontal-scroll'))) {
          failures.push(`clipped ${identify(element)} ${Math.round(rect.left)}..${Math.round(rect.right)}`)
        }
        if (rect.width < 44 || rect.height < 44) {
          failures.push(`${identify(element)} ${Math.round(rect.width)}x${Math.round(rect.height)}`)
        }
      }
    }

    if (phone) {
      for (const element of document.querySelectorAll('input:not([type="hidden"]),select,textarea')) {
        if (visible(element) && parseFloat(getComputedStyle(element).fontSize) < 16) {
          failures.push(`input font ${getComputedStyle(element).fontSize}`)
        }
      }
      for (const element of document.body.querySelectorAll('*')) {
        const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
        if (!ownText || !visible(element) || element.matches('script,style,.skip-link:not(:focus)') || element.classList.contains('sr-only')) continue
        const size = parseFloat(getComputedStyle(element).fontSize)
        if (size < 12) failures.push(`text font ${identify(element)} ${size}px`)
        if (element.matches('label,.label,.h-sub,td,dt,dd') && size < 13) {
          failures.push(`secondary font ${identify(element)} ${size}px`)
        }
        if (element.matches('p:not(.h-sub):not(.label):not(.caption):not(.chart-legend):not(.table-scroller__hint),li') && size < 15) {
          failures.push(`body font ${identify(element)} ${size}px`)
        }
      }
    }
    return [...new Set(failures)]
  }, { mobile })
  expect(result, result.join('\n')).toEqual([])
}

export async function capturePage(page, { name, testInfo }) {
  if (!process.env.E2E_CAPTURE_DIR) return
  const folder = resolve(process.env.E2E_CAPTURE_DIR, testInfo.project.name)
  await mkdir(folder, { recursive: true })
  const filename = `${name.replaceAll(/[^a-z0-9]+/gi, '-') || 'root'}.png`
  await page.screenshot({ path: join(folder, filename), fullPage: true })
}
