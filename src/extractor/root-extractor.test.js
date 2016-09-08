import assert from 'assert'
import fs from 'fs'
import cheerio from 'cheerio'

import RootExtractor from './root-extractor'
import {
  cleanBySelectors,
  transformElements
} from './root-extractor'

import GenericExtractor from './generic'
import NYMagExtractor from './custom/nymag.com'

describe('RootExtractor', () => {
  it('extracts based on custom selectors', () => {
    const url = 'http://nymag.com/daily/intelligencer/2016/09/trump-discussed-usd25k-donation-with-florida-ag-not-fraud.html'
    const html = fs.readFileSync('./src/extractor/custom/nymag.com/fixtures/test.html', 'utf8')
    const $ = cheerio.load(html)

    const {
      title,
      content,
      author,
      datePublished,
      leadImageUrl,
    } = RootExtractor.extract(
      NYMagExtractor, { url, html, $, metaCache: [] }
    )

    assert.equal(title, 'Trump Claims He Discussed $25K Donation With Florida Attorney General, But Not Trump University Investigation')
  })
})

describe('cleanBySelectors($content, $, { clean })', () => {
  it('removes provided selectors from the content', () => {
    const opts = { clean: ['.ad', '.share'] }
    const html = `
      <div>
        <div class="body">
          <div class="share">Share this on twitter plz</div>
          <p>This is some good content</p>
          <div class="ad">Advertisement!</div>
        </div>
    </div>`
    const $ = cheerio.load(html)

    let $content = $('.body')
    $content = cleanBySelectors($content, $, opts)

    assert.equal($content.find('.ad').length, 0)
    assert.equal($content.find('.share').length, 0)
  })
})

describe('transformElements($content, $, { transforms })', () => {
  it('performs a simple transformation on matched elements', () => {
    const html = `
    <div>
      <div class="body">
        <h1>WOW BIG TITLE</h1>
        <p>Here are some words</p>
        <h1>WOW BIG TITLE</h1>
      </div>
    </div>
    `
    const opts = {
      transforms: { 'h1': 'h2' }
    }
    const $ = cheerio.load(html)
    let $content = $('.body')

    const after = `
      <div class="body">
        <h2>WOW BIG TITLE</h2>
        <p>Here are some words</p>
        <h2>WOW BIG TITLE</h2>
      </div>
    `

    $content = transformElements($content, $, opts)
    assertClean($.html($content), after)
  })

  it('performs a complex transformation on matched elements', () => {
    const html = `
    <div>
      <div class="body">
        <noscript>
          <img src="/img.jpg" />
        </noscript>
        <noscript>
          Something else
        </noscript>
        <p>Here are some words</p>
      </div>
    </div>
    `
    const opts = {
      transforms: {
        'noscript': ($node) => {
          const $children = $node.children()
          if ($children.length === 1 && $children.get(0).tagName === 'img') {
            return 'figure'
          }
        }
      }
    }
    const $ = cheerio.load(html)
    let $content = $('.body')

    const after = `
      <div class="body">
        <figure>
          <img src="/img.jpg">
        </figure>
        <noscript>
          Something else
        </noscript>
        <p>Here are some words</p>
      </div>
    `

    $content = transformElements($content, $, opts)
    assertClean($.html($content), after)
  })
})

export function clean(string) {
  return string.trim().replace(/\r?\n|\r/g, '').replace(/\s+/g, ' ')
}

export function assertClean(a, b) {
  assert.equal(clean(a), clean(b))
}

