import { redirect } from 'next/navigation'

export default async function FodaRedirect({ params }) {
  const { id } = await params
  redirect(`/centro/${id}/peticiones`)
}
