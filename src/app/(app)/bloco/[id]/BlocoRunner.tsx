"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Alternativa = { id: string; letra: string; texto: string };
type Pergunta = {
  id: string;
  ordem: number;
  numero: string | null;
  disciplina: string | null;
  assunto: string | null;
  enunciado: string;
  temImagem: boolean;
  alternativas: Alternativa[];
};
type Confianca = "certeza" | "duvida" | "chute";

type Correcao = {
  correta: boolean | null;
  gabarito: { respostaLetra: string | null; justificativa: string | null; status: string } | null;
};

export function BlocoRunner({
  blockId,
  modo,
  perguntas,
  respondidasIds,
}: {
  blockId: string;
  modo: string;
  perguntas: Pergunta[];
  respondidasIds: string[];
}) {
  const router = useRouter();
  const primeiraNaoRespondida = useMemo(() => {
    const idx = perguntas.findIndex((p) => !respondidasIds.includes(p.id));
    return idx === -1 ? perguntas.length : idx;
  }, [perguntas, respondidasIds]);

  const [indice, setIndice] = useState(primeiraNaoRespondida);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [semResposta, setSemResposta] = useState(false);
  const [confianca, setConfianca] = useState<Confianca | null>(null);
  const [anotacao, setAnotacao] = useState("");
  const [trocas, setTrocas] = useState(0);
  const [correcao, setCorrecao] = useState<Correcao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tempoInicioQuestao, setTempoInicioQuestao] = useState(() => Date.now());

  const pergunta = perguntas[indice];

  function escolher(id: string) {
    if (selecionada && selecionada !== id) setTrocas((t) => t + 1);
    setSelecionada(id);
    setSemResposta(false);
  }

  async function enviar() {
    if (!semResposta && !selecionada) {
      setErro("Escolha uma alternativa ou marque como sem resposta.");
      return;
    }
    if (!confianca && !semResposta) {
      setErro("Indique seu nível de confiança antes de enviar.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const tempoAtivoSegundos = Math.round((Date.now() - tempoInicioQuestao) / 1000);
    const res = await fetch(`/api/blocos/${blockId}/responder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: pergunta.id,
        alternativaId: semResposta ? null : selecionada,
        semResposta,
        confianca: semResposta ? null : confianca,
        tempoAtivoSegundos,
        anotacao: anotacao || null,
        trocouResposta: trocas > 0,
      }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setErro(data.erro || "Erro ao registrar resposta.");
      return;
    }
    if (modo === "estudo") {
      setCorrecao({ correta: data.correta, gabarito: data.gabarito });
    } else {
      avancar();
    }
  }

  function avancar() {
    setCorrecao(null);
    setSelecionada(null);
    setSemResposta(false);
    setConfianca(null);
    setAnotacao("");
    setTrocas(0);
    setTempoInicioQuestao(Date.now());
    if (indice + 1 >= perguntas.length) {
      finalizar();
    } else {
      setIndice((i) => i + 1);
    }
  }

  async function finalizar() {
    setFinalizando(true);
    const res = await fetch(`/api/blocos/${blockId}/finalizar`, { method: "POST" });
    setFinalizando(false);
    if (res.ok) {
      router.push(`/bloco/${blockId}/resultado`);
    } else {
      const data = await res.json().catch(() => ({}));
      setErro(data.erro || "Erro ao finalizar bloco.");
    }
  }

  if (!pergunta) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="mb-4">Todas as questões deste bloco já foram respondidas.</p>
        <button
          onClick={finalizar}
          disabled={finalizando}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white"
        >
          {finalizando ? "Gerando diagnóstico e PDF…" : "Ver diagnóstico"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between text-sm text-foreground-muted">
        <span>
          Questão {indice + 1} de {perguntas.length} {pergunta.numero ? `(nº ${pergunta.numero})` : ""}
        </span>
        <span>{modo === "estudo" ? "Modo estudo" : "Modo simulado"}</span>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground-muted">
          {pergunta.disciplina} {pergunta.assunto ? `· ${pergunta.assunto}` : ""}
        </p>
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed">{pergunta.enunciado}</p>
        {pergunta.temImagem && (
          <p className="mb-3 rounded bg-warning-soft px-3 py-2 text-xs text-warning">
            Esta questão possui imagem associada no arquivo original — consulte a prova importada se necessário.
          </p>
        )}

        <div className="space-y-2">
          {pergunta.alternativas.map((alt) => (
            <button
              key={alt.id}
              onClick={() => escolher(alt.id)}
              disabled={!!correcao}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                selecionada === alt.id ? "border-brand bg-surface-muted" : "border-border hover:bg-surface-muted"
              } ${
                correcao?.gabarito?.respostaLetra === alt.letra
                  ? "border-success bg-success-soft"
                  : correcao && selecionada === alt.id && !correcao.correta
                    ? "border-danger bg-danger-soft"
                    : ""
              }`}
            >
              <span className="font-medium">{alt.letra})</span> {alt.texto}
            </button>
          ))}
          <button
            onClick={() => {
              setSemResposta(true);
              setSelecionada(null);
            }}
            disabled={!!correcao}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
              semResposta ? "border-brand bg-surface-muted" : "border-border hover:bg-surface-muted"
            }`}
          >
            Deixar sem resposta
          </button>
        </div>

        {!correcao && !semResposta && (
          <div className="mt-4">
            <p className="mb-1 text-sm font-medium">Nível de confiança</p>
            <div className="flex gap-2">
              {(["certeza", "duvida", "chute"] as Confianca[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setConfianca(c)}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-sm capitalize ${
                    confianca === c ? "border-brand bg-surface-muted font-medium" : "border-border"
                  }`}
                >
                  {c === "certeza" ? "Tenho certeza" : c === "duvida" ? "Estou em dúvida" : "Foi chute"}
                </button>
              ))}
            </div>
          </div>
        )}

        {!correcao && (
          <textarea
            value={anotacao}
            onChange={(e) => setAnotacao(e.target.value)}
            placeholder="Anotação opcional sobre esta questão…"
            className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            rows={2}
          />
        )}

        {correcao && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm ${
              correcao.correta === null
                ? "bg-warning-soft text-warning"
                : correcao.correta
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger"
            }`}
          >
            {correcao.correta === null
              ? "Gabarito ainda ausente para esta questão — resposta registrada, mas não contabilizada como acerto/erro até haver gabarito."
              : correcao.correta
                ? "Você acertou."
                : "Você errou."}
            {correcao.gabarito?.justificativa && (
              <p className="mt-1 text-foreground">{correcao.gabarito.justificativa}</p>
            )}
          </div>
        )}

        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          {!correcao ? (
            <button
              onClick={enviar}
              disabled={enviando}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {enviando ? "Enviando…" : "Responder"}
            </button>
          ) : (
            <button
              onClick={avancar}
              disabled={finalizando}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {indice + 1 >= perguntas.length
                ? finalizando
                  ? "Gerando diagnóstico e PDF…"
                  : "Concluir bloco"
                : "Próxima questão"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
