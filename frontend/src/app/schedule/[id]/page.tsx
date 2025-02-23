// src/app/schedule/[id]/page.tsx
import ViewScheduleClient from './ViewScheduleClient';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ViewSchedulePage({ params }: Props) {
  const resolvedParams = await params;
  return <ViewScheduleClient scheduleId={resolvedParams.id} />;
}
