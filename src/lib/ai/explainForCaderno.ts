import { getAnthropicClient, iaDisponivel, MODELO_PADRAO, estimarCustoUsd } from "./client";

export type ConteudoCaderno = {
  explicacao: string;
  resumoTeorico: string;
  perguntaRecuperacao: string;
  respostaRecuperacao: string;
  geradoPorIa: boolean;
  tokensEntrada?: number;
  tokensSaida?: number;
  custoEstimadoUsd?: number;
};

/**
 * Gera o conteúdo pedagógico de um item do caderno de erros. Quando a IA não
 * está configurada, usa um modelo textual honesto baseado apenas no que já
 * está no banco (gabarito/justificativa), sem inventar conteúdo teórico.
 */
export async function gerarConteudoCaderno(params: {
  area: "concursos" | "medicina";
  disciplina: string | null;
  assunto: string | null;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  respostaCorretaLetra: string | null;
  justificativaGabarito: string | null;
  alternativaEscolhidaLetra: string | null;
}): Promise<ConteudoCaderno> {
  if (!iaDisponivel()) {
    const corretaTexto =
      params.alternativas.find((a) => a.letra === params.respostaCorretaLetra)?.texto ?? "(não informado)";
    return {
      explicacao: params.justificativaGabarito
        ? `Justificativa do gabarito: ${params.justificativaGabarito}`
        : `Resposta de referência: alternativa ${params.respostaCorretaLetra ?? "?"} (${corretaTexto}). Cadastre uma justificativa na questão ou configure ANTHROPIC_API_KEY para gerar uma explicação automática.`,
      resumoTeorico: `Revise o material sobre "${params.assunto ?? params.disciplina ?? "este tópico"}" na fonte cadastrada para esta questão. Resumo automático indisponível (IA não configurada).`,
      perguntaRecuperacao: `O que diferencia a alternativa correta das demais nesta questão sobre ${params.assunto ?? params.disciplina ?? "o tema"}?`,
      respostaRecuperacao: `Ver alternativa ${params.respostaCorretaLetra ?? "?"}.`,
      geradoPorIa: false,
    };
  }

  const client = getAnthropicClient();
  const system = `Você escreve o conteúdo de um caderno de erros de estudo (estilo "erro identificado → conceito necessário → como reconhecer na próxima questão"). Seja direto, curto (máx. 4 frases por campo) e didático. Responda apenas com JSON: {"explicacao": "...", "resumoTeorico": "...", "perguntaRecuperacao": "...", "respostaRecuperacao": "..."}. Nunca invente números, leis ou estatísticas que não estejam no material fornecido — se precisar generalizar, use linguagem qualificada ("em geral", "tipicamente").`;

  const userPrompt = `Área: ${params.area}
Disciplina: ${params.disciplina ?? "?"} / Assunto: ${params.assunto ?? "?"}
Enunciado: ${params.enunciado}
Alternativas: ${params.alternativas.map((a) => `${a.letra}) ${a.texto}`).join(" | ")}
Resposta correta: ${params.respostaCorretaLetra ?? "não informada"}
Alternativa escolhida pelo usuário: ${params.alternativaEscolhidaLetra ?? "sem resposta"}
Justificativa oficial (se houver): ${params.justificativaGabarito ?? "nenhuma cadastrada"}`;

  const resposta = await client.messages.create({
    model: MODELO_PADRAO,
    max_tokens: 700,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const texto = resposta.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n");
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("A IA não retornou JSON válido para o caderno.");
  const parsed = JSON.parse(match[0]);

  return {
    ...parsed,
    geradoPorIa: true,
    tokensEntrada: resposta.usage.input_tokens,
    tokensSaida: resposta.usage.output_tokens,
    custoEstimadoUsd: estimarCustoUsd(resposta.usage.input_tokens, resposta.usage.output_tokens),
  };
}
