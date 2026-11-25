import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page';
import { CsirtSuiviIncident } from '@/components/csirt/csirt-suivi-incident';

export const metadata = {
  title: 'Suivi de Signalement d’Incident — CSIRT-ARPT',
  description: 'Suivez l’état de prise en charge et de traitement de votre signalement de sécurité numérique par le CSIRT-ARPT.',
};

export default function SuiviIncidentPage() {
  return (
    <CsirtInnerPage variant="full">
      <CsirtSuiviIncident />
    </CsirtInnerPage>
  );
}
