/* @next-codemod-ignore */

import ViewScheduleClient from "./ViewScheduleClient";

export default async function ViewSchedulePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params; // ✅ No need to await, params is already available

  return <ViewScheduleClient scheduleId={id} />;
}
