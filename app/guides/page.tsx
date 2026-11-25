import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Guides pratiques — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/guides"
      title="Guides pratiques"
      lead="Les guides de bonnes pratiques seront enrichis à partir de la v2.0."
    />
  )
}
