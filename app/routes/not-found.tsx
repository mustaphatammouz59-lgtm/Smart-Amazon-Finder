import { data } from 'react-router'
import { buildMeta } from '../lib/seo'
import { NotFoundState } from '../components/state/states'

export function meta() {
  return buildMeta({
    title: 'Page Not Found',
    description: 'The page you requested could not be found.',
    path: '/404',
    noIndex: true,
  })
}

/** Catch-all route: renders the custom 404 page with a real 404 status. */
export function loader() {
  return data(null, { status: 404 })
}

export default function NotFound() {
  return <NotFoundState />
}
