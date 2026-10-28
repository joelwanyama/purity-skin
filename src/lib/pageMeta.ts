import { useEffect } from 'react'

type Meta = {
  title: string
  description?: string
  /** Canonical path for this page, e.g. "/shop". */
  path?: string
  /** Product pages and other indexable content keep the default. */
  noindex?: boolean
}

const SITE = 'PURITY SKIN'

function upsert(selector: string, create: () => HTMLMetaElement | HTMLLinkElement, apply: (element: HTMLMetaElement | HTMLLinkElement) => void) {
  const existing = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector)
  const element = existing ?? create()
  apply(element)
  if (!existing) document.head.append(element)
}

function meta(name: string, content: string, property = false) {
  const attribute = property ? 'property' : 'name'
  upsert(`meta[${attribute}="${name}"]`, () => document.createElement('meta'), (element) => {
    element.setAttribute(attribute, name)
    element.setAttribute('content', content)
  })
}

/**
 * Keeps title, description, canonical and social tags in step with the visible
 * page. Previews of this app are static files, so metadata has to be set here
 * rather than by a server.
 */
export function usePageMeta({ title, description, path, noindex = false }: Meta) {
  useEffect(() => {
    const fullTitle = title.includes(SITE) ? title : `${title} · ${SITE}`
    document.title = fullTitle

    if (description) {
      meta('description', description)
      meta('og:description', description, true)
      meta('twitter:description', description)
    }
    meta('og:title', fullTitle, true)
    meta('twitter:title', fullTitle)

    const origin = window.location.origin
    // WhatsApp and other crawlers ignore relative image URLs, so always absolute.
    meta('og:image', `${origin}/og.png`, true)
    meta('twitter:image', `${origin}/og.png`)
    if (path) {
      upsert('link[rel="canonical"]', () => document.createElement('link'), (element) => {
        element.setAttribute('rel', 'canonical')
        element.setAttribute('href', `${origin}${path}`)
      })
      meta('og:url', `${origin}${path}`, true)
    }

    const robots = 'noindex, nofollow'
    if (noindex) {
      meta('robots', robots)
    } else {
      document.head.querySelector('meta[name="robots"]')?.remove()
    }
  }, [title, description, path, noindex])
}
