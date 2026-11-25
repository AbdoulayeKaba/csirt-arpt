import { redirect } from 'next/navigation';

type Props = { params: Promise<{ token: string }> };

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;
  redirect(`/signalement?invitation=${encodeURIComponent(decodeURIComponent(token))}`);
}
