"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/types";

type QuestaoRascunho = {
  id: string;
  enunciado: string;
  numero_no_caderno: string | null;
  disciplina: string | null;
  assunto: string | null;
  subassunto: string | null;
  motivo_revisao: string | null;
  alternativas: { letra: string; texto: string }[];
};

type GabaritoBruto = { numeroNoCaderno: string; respostaLetra: string | null; anulada: boolean; confianca: string };

export function RevisaoArquivo({
  arquivo,
  questoesRascunho,
}: {
  arquivo: Tables<"exam_files">;
  questoesRascunho: QuestaoRascunho[];
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [edicoes, setEdicoes] = useState<Record<string, Partial<QuestaoRascunho> & { descartar?: boolean }>>({});
  const gabaritoBruto = ((arquivo.extracao_bruta as { gabarito?: GabaritoBruto[] } | null)?.gabarito ?? []) as GabaritoBruto[];
  const [gabaritoEditado, setGabaritoEditado] = useState<GabaritoBruto[]>(gabaritoBruto);
  const [statusGabarito, setStatusGabarito] = useState<"extraoficial" | "oficial_preliminar" | "oficial_definitivo">(
    "extraoficial",
  );
  const [resultadoAplicacao, setResultadoAplicacao] = useState<{ aplicados: string[]; naoAplicados: { numeroNoCaderno: string; motivo: string }[] } | null>(null);

  async function extrair() {
    setCarregando(true);
    await fetch(`/api/arquivos/${arquivo.id}/extrair`, { method: "POST" });
    setCarregando(false);
    router.refresh();
  }

  function atualizarCampo(id: string, campo: string, valor: unknown) {
    setEdicoes((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  }

  async function confirmarQuestoes() {
    setCarregando(true);
    const payload = questoesRascunho.map((q) => {
      const edicao = edicoes[q.id] ?? {};
      return {
        id: q.id,
        descartar: edicao.descartar ?? false,
        enunciado: edicao.enunciado ?? q.enunciado,
        disciplina: edicao.disciplina ?? q.disciplina ?? "",
        assunto: edicao.assunto ?? q.assunto ?? "",
        subassunto: edicao.subassunto ?? q.subassunto ?? "",
        alternativas: q.alternativas,
      };
    });
    await fetch(`/api/arquivos/${arquivo.id}/confirmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questoes: payload }),
    });
    setCarregando(false);
    router.refresh();
  }

  async function aplicarGabarito() {
    setCarregando(true);
    const res = await fetch(`/api/arquivos/${arquivo.id}/gabarito-aplicar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusGabarito, itens: gabaritoEditado }),
    });
    const data = await res.json();
    setResultadoAplicacao(data);
    setCarregando(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-medium">
            {arquivo.nome_original} <span className="text-xs text-foreground-muted">({arquivo.tipo})</span>
          </p>
          <p className="text-xs text-foreground-muted">
            Status: {arquivo.status} {arquivo.ocr_utilizado ? "· OCR utilizado" : ""}
          </p>
        </div>
        {(arquivo.status === "pendente" || arquivo.status === "erro") && (
          <button onClick={extrair} disabled={carregando} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white">
            {arquivo.status === "erro" ? "Tentar novamente" : "Extrair"}
          </button>
        )}
      </div>

      {arquivo.status === "erro" && <p className="text-sm text-danger">{arquivo.erro_mensagem}</p>}

      {arquivo.tipo === "prova" && questoesRascunho.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            {questoesRascunho.length} questão(ões) extraída(s) aguardando revisão. Confira e complete disciplina/assunto
            antes de confirmar — nada aqui pontua até ser confirmado.
          </p>
          {questoesRascunho.map((q) => (
            <div key={q.id} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground-muted">Questão nº {q.numero_no_caderno}</span>
                <label className="flex items-center gap-1 text-xs text-danger">
                  <input
                    type="checkbox"
                    onChange={(e) => atualizarCampo(q.id, "descartar", e.target.checked)}
                  />
                  Descartar
                </label>
              </div>
              {q.motivo_revisao && (
                <p className="mb-2 rounded bg-warning-soft px-2 py-1 text-xs text-warning">{q.motivo_revisao}</p>
              )}
              <textarea
                defaultValue={q.enunciado}
                onChange={(e) => atualizarCampo(q.id, "enunciado", e.target.value)}
                className="mb-2 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
                rows={3}
              />
              <ul className="mb-2 space-y-1 text-sm">
                {q.alternativas.map((a) => (
                  <li key={a.letra}>
                    <span className="font-medium">{a.letra})</span> {a.texto}
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-3 gap-2">
                <input
                  placeholder="Disciplina"
                  defaultValue={q.disciplina ?? ""}
                  onChange={(e) => atualizarCampo(q.id, "disciplina", e.target.value)}
                  className="rounded border border-border bg-surface px-2 py-1 text-sm"
                />
                <input
                  placeholder="Assunto"
                  defaultValue={q.assunto ?? ""}
                  onChange={(e) => atualizarCampo(q.id, "assunto", e.target.value)}
                  className="rounded border border-border bg-surface px-2 py-1 text-sm"
                />
                <input
                  placeholder="Subassunto"
                  defaultValue={q.subassunto ?? ""}
                  onChange={(e) => atualizarCampo(q.id, "subassunto", e.target.value)}
                  className="rounded border border-border bg-surface px-2 py-1 text-sm"
                />
              </div>
            </div>
          ))}
          <button
            onClick={confirmarQuestoes}
            disabled={carregando}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Confirmar questões revisadas
          </button>
        </div>
      )}

      {arquivo.tipo === "gabarito" && gabaritoEditado.length > 0 && arquivo.status !== "confirmado" && (
        <div className="space-y-3">
          <p className="text-sm text-foreground-muted">
            {gabaritoEditado.length} linha(s) de gabarito identificadas. Selecione o status oficial e confira antes de
            aplicar — a aplicação só afeta questões já confirmadas com o mesmo número nesta prova.
          </p>
          <select
            value={statusGabarito}
            onChange={(e) => setStatusGabarito(e.target.value as typeof statusGabarito)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="extraoficial">Extraoficial</option>
            <option value="oficial_preliminar">Oficial preliminar</option>
            <option value="oficial_definitivo">Oficial definitivo</option>
          </select>
          <div className="max-h-80 overflow-y-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs">
                <tr>
                  <th className="p-2 text-left">Nº</th>
                  <th className="p-2 text-left">Resposta</th>
                  <th className="p-2 text-left">Anulada</th>
                  <th className="p-2 text-left">Confiança</th>
                </tr>
              </thead>
              <tbody>
                {gabaritoEditado.map((g, idx) => (
                  <tr key={g.numeroNoCaderno} className="border-t border-border">
                    <td className="p-2">{g.numeroNoCaderno}</td>
                    <td className="p-2">
                      <select
                        value={g.respostaLetra ?? ""}
                        onChange={(e) =>
                          setGabaritoEditado((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, respostaLetra: e.target.value || null } : x)),
                          )
                        }
                        className="rounded border border-border bg-surface px-1 py-0.5"
                      >
                        <option value="">—</option>
                        {["A", "B", "C", "D", "E"].map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={g.anulada}
                        onChange={(e) =>
                          setGabaritoEditado((prev) => prev.map((x, i) => (i === idx ? { ...x, anulada: e.target.checked } : x)))
                        }
                      />
                    </td>
                    <td className="p-2 text-xs text-foreground-muted">{g.confianca}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={aplicarGabarito} disabled={carregando} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
            Aplicar gabarito às questões confirmadas
          </button>
          {resultadoAplicacao && (
            <div className="text-sm">
              <p className="text-success">{resultadoAplicacao.aplicados.length} aplicado(s) com sucesso.</p>
              {resultadoAplicacao.naoAplicados.length > 0 && (
                <div className="text-warning">
                  <p>Não aplicados:</p>
                  <ul className="list-disc pl-5">
                    {resultadoAplicacao.naoAplicados.map((n) => (
                      <li key={n.numeroNoCaderno}>
                        Nº {n.numeroNoCaderno}: {n.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
