import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });

  const { data: exam } = await supabase.from("exams").select("id, area").eq("id", examId).single();
  if (!exam) return NextResponse.json({ erro: "Prova não encontrada." }, { status: 404 });

  const form = await req.formData();
  const file = form.get("arquivo") as File | null;
  const tipo = ((form.get("tipo") as string) || "prova") as "prova" | "gabarito" | "edital" | "outro";
  if (!file) return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 422 });

  const extensao = file.name.split(".").pop() || "bin";
  const storagePath = `${exam.area}/${examId}/${tipo}-${Date.now()}.${extensao}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: erroUpload } = await supabase.storage
    .from("imports")
    .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });
  if (erroUpload) return NextResponse.json({ erro: erroUpload.message }, { status: 500 });

  const { data: exameFile, error } = await supabase
    .from("exam_files")
    .insert({
      exam_id: examId,
      tipo,
      storage_path: storagePath,
      nome_original: file.name,
      status: "pendente",
      enviado_por: profile.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ fileId: exameFile.id });
}
