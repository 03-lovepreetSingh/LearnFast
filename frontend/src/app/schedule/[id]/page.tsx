// src/app/schedule/[id]/page.tsx
import ViewScheduleClient from "./ViewScheduleClient";

export default async function ViewSchedulePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params; // Ensure it's awaited

  return <ViewScheduleClient scheduleId={id} />;
}
