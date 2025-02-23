// src/app/schedule/[id]/page.tsx
import ViewScheduleClient from "./ViewScheduleClient";

interface PageProps {
  params: {
    id: string;
  }
}

const ViewSchedulePage = async ({ params }: PageProps) => {
  return <ViewScheduleClient scheduleId={params.id} />;
};

export default ViewSchedulePage;
export default async function ViewSchedulePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params; // Ensure it's awaited

  return <ViewScheduleClient scheduleId={id} />;
}
