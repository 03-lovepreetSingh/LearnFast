// src/app/schedule/[id]/page.tsx
import ViewScheduleClient from './ViewScheduleClient';

export default function ViewSchedulePage({ params }: { params: { id: string } }) {
  return <ViewScheduleClient scheduleId={params.id} />;
}