import { getCurrentProfile } from "@/lib/data/profile";
import { AreaHome } from "@/components/AreaHome";

export default async function ConcursosPage() {
  const profile = await getCurrentProfile();
  return <AreaHome profile={profile} area="concursos" titulo="Concursos — Matheus" />;
}
