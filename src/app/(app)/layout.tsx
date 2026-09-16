import { getCurrentProfile } from "@/lib/data/profile";
import { Nav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav nome={profile.nome_exibicao} area={profile.area} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
