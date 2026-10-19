import { useEffect } from 'react'
import { SITE_NAME, absoluteUrl, ogImage } from './site'

interface Seo {
  // The page's own title. Keep it under about 60 characters.
  title: string
  // One or two sentences for search results. Keep it under about 160 characters.
  description: string
  // The page's path, e.g. /events/some-election. Used for the canonical link and the share preview.
  path?: string
  // A picture for share previews (WhatsApp, Facebook, X). Use a full web address.
  image?: string
  type?: 'website' | 'article'
  // Structured data for search engines, as one object or a list.
  jsonLd?: object | object[]
  // Pages that should stay out of search results, like the dashboard and sign-in.
  noindex?: boolean
}

// Finds the tag matching `selector` in <head>, or makes it, and sets its attributes.
const upsert = (tag: 'meta' | 'link', selector: string, attrs: Record<string, string>) => {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = document.createElement(tag)
    document.head.appendChild(el)
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
}
const meta = (name: string, content: string) => upsert('meta', `meta[name="${name}"]`, { name, content })
const og = (property: string, content: string) => upsert('meta', `meta[property="${property}"]`, { property, content })

// Sets the page's title, description, canonical link, Open Graph and Twitter tags, robots rule and structured data.
// Each page calls it once; the next page replaces what this one set.
export function useSeo({ title, description, path, image: pageImage, type = 'website', jsonLd, noindex }: Seo) {
  // Pages without a picture of their own share the default one.
  const image = pageImage ?? ogImage('default')
  const json = jsonLd ? JSON.stringify(jsonLd) : ''
  useEffect(() => {
    document.title = title
    meta('description', description)
    meta('robots', noindex ? 'noindex, nofollow' : 'index, follow')

    const url = path ? absoluteUrl(path) : window.location.href.split('#')[0]
    if (!noindex) upsert('link', 'link[rel="canonical"]', { rel: 'canonical', href: url })
    else document.head.querySelector('link[rel="canonical"]')?.remove()

    og('og:site_name', SITE_NAME)
    og('og:type', type)
    og('og:title', title)
    og('og:description', description)
    og('og:url', url)
    meta('twitter:card', 'summary_large_image')
    meta('twitter:title', title)
    meta('twitter:description', description)
    og('og:image', image)
    meta('twitter:image', image)

    let script = document.getElementById('seo-jsonld')
    if (json) {
      if (!script) {
        script = document.createElement('script')
        script.id = 'seo-jsonld'
        script.setAttribute('type', 'application/ld+json')
        document.head.appendChild(script)
      }
      script.textContent = json
    } else script?.remove()
  }, [title, description, path, image, type, noindex, json])
}
