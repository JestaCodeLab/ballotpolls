import { useLocation } from 'react-router-dom'
import { useSeo } from './useSeo'
import { SITE_NAME } from './site'

// Names the browser tab for the signed-in screens: the section the person is in, then the product. Matches the longest
// path first, so '/elections/new' is "New election" and not "Elections". These pages stay out of search results.
export function useDashboardTitle(sections: [path: string, title: string][], suffix = SITE_NAME) {
  const { pathname } = useLocation()
  const hit = [...sections].sort((a, b) => b[0].length - a[0].length).find(([p]) => pathname === p || pathname.startsWith(`${p}/`))
  useSeo({ title: `${hit?.[1] ?? 'Dashboard'} | ${suffix}`, description: `${SITE_NAME} dashboard.`, noindex: true })
}
