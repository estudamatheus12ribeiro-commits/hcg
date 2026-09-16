import { getCurrentProfile } from "@/lib/data/profile";
import { AreaHome } from "@/components/AreaHome";

export default async function MedicinaPage() {
  const profile = await getCurrentProfile();
  return <AreaHome profile={profile} area="medicina" titulo="Medicina — Laura" />;
}
