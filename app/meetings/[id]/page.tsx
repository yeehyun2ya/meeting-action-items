import { MeetingDetail } from "@/components/MeetingDetail";

type MeetingDetailPageProps = {
  readonly params: Promise<{
    readonly id: string;
  }>;
};

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const { id } = await params;

  return <MeetingDetail id={id} />;
}
