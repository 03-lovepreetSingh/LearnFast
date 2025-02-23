// src/app/schedule/[id]/page.tsx
import ViewScheduleClient from './ViewScheduleClient';

interface PageProps {
  params: {
    id: string;
  }
}

const ViewSchedulePage = async ({ params }: PageProps) => {
  return <ViewScheduleClient scheduleId={params.id} />;
};

export default ViewSchedulePage;