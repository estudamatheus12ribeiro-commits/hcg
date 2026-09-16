import { getAnthropicClient, MODELO_PADRAO, estimarCustoUsd } from "./client";
import type { PerfilProva } from "@/lib/domain/examAnalysis";

export type QuestaoGeradaIA = {
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  respostaCorreta: string;
  justificativa: string;
  explicacaoAlternativas: Record<string, string>;
  disciplina: string;
  assunto: string;
  dificuldadeEstimada: "facil" | "media" | "dificil";
  fontesSugeridas: string[];
};

export type ResultadoGeracaoIA = {
  questoes: QuestaoGeradaIA[];
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  custoEstimadoUsd: number;
  promptResumo: string;
};

export async function gerarQuestoesIneditas(params: {
  area: "concursos" | "medicina";
  banca: string | null;
  disciplina: string;
  assunto: string;
  quantidade: number;
  perfil: PerfilProva | null;
  exemplosEnunciados: string[];
}): Promise<ResultadoGeracaoIA> {
  const client = getAnthropicClient();

  const contextoAmostra = params.perfil
    ? `Análise de incidência baseada em ${params.perfil.amostra.totalQuestoes} questões de ${params.perfil.amostra.totalProvas} prova(s) (${
        params.perfil.amostra.anos.join(", ") || "anos não identificados"
      }, bancas: ${params.perfil.amostra.bancas.join(", ") || "não identificadas"}). ${
        params.perfil.amostraSuficiente
          ? ""
          : "AVISO: amostra pequena — trate os padrões como indicativos, não conclusivos."
      } Tamanho médio de enunciado: ${params.perfil.tamanhoMedioEnunciado} caracteres. Tipos de raciocínio mais comuns: ${params.perfil.tiposRaciocinio
        .slice(0, 3)
        .map((t) => t.tipo)
        .join(", ")}.`
    : "Nenhuma prova importada dessa banca/assunto foi analisada — gere no padrão geral do tipo de exame, deixando claro que não há amostra própria.";

  const system = `Você cria questões de múltipla escolha INÉDITAS para estudo, no estilo de bancas de ${
    params.area === "concursos" ? "concursos públicos brasileiros" : "provas médicas brasileiras (Enamed/Enare/residência)"
  }. Regras estritas:
- NUNCA afirme que a questão é oficial ou que veio de uma prova real.
- Baseie o estilo (tamanho, estrutura, tipo de raciocínio, armadilhas) no perfil estatístico fornecido, mas o conteúdo deve ser original.
- Toda questão precisa ter exatamente uma resposta correta, justificativa fundamentada e explicação de por que cada alternativa incorreta está errada.
- Se não tiver certeza de um dado factual, prefira formular a questão em torno de conceitos consolidados e amplamente aceitos, não de números ou datas obscuras.
- Responda SOMENTE com um JSON válido: um array de objetos com os campos enunciado, alternativas (array de {letra,texto}, 4 ou 5 alternativas), respostaCorreta (letra), justificativa, explicacaoAlternativas (objeto letra->texto explicando cada uma), disciplina, assunto, dificuldadeEstimada ("facil"|"media"|"dificil"), fontesSugeridas (array de strings com nome de referências gerais e verificáveis pelo usuário, ex: "Lei 8.112/1990" ou "Diretriz XYZ da sociedade médica" — nunca invente URLs ou números de artigo específicos que não tenha certeza).`;

  const userPrompt = `${contextoAmostra}

Gere ${params.quantidade} questão(ões) inédita(s) de ${params.disciplina} sobre "${params.assunto}"${
    params.banca ? ` no estilo da banca ${params.banca}` : ""
  }.
${
  params.exemplosEnunciados.length > 0
    ? `Exemplos de enunciados reais importados (apenas para referência de estilo, não copie): \n${params.exemplosEnunciados
        .slice(0, 3)
        .map((e, i) => `${i + 1}. ${e.slice(0, 400)}`)
        .join("\n")}`
    : ""
}`;

  const resposta = await client.messages.create({
    model: MODELO_PADRAO,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textoResposta = resposta.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n");

  const jsonMatch = textoResposta.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("A IA não retornou um JSON de questões válido.");
  }
  const questoes: QuestaoGeradaIA[] = JSON.parse(jsonMatch[0]);

  return {
    questoes,
    modelo: MODELO_PADRAO,
    tokensEntrada: resposta.usage.input_tokens,
    tokensSaida: resposta.usage.output_tokens,
    custoEstimadoUsd: estimarCustoUsd(resposta.usage.input_tokens, resposta.usage.output_tokens),
    promptResumo: `${params.quantidade}x ${params.disciplina}/${params.assunto}`,
  };
}
