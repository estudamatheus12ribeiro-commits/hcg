export type QuestaoParaAnalise = {
  enunciado: string;
  disciplina: string | null;
  assunto: string | null;
  tipo_raciocinio: string | null;
  tem_imagem: boolean;
  numero_alternativas: number;
  ano: number | null;
  banca: string | null;
};

export type PerfilProva = {
  amostra: {
    totalQuestoes: number;
    totalProvas: number;
    anos: number[];
    bancas: string[];
  };
  frequenciaAssunto: { assunto: string; ocorrencias: number; percentual: number }[];
  tamanhoMedioEnunciado: number;
  distribuicaoAlternativas: Record<number, number>;
  tiposRaciocinio: { tipo: string; ocorrencias: number }[];
  percentualComImagem: number;
  amostraSuficiente: boolean; // abaixo de um mínimo, a análise deve ser tratada como indicativa
};

const AMOSTRA_MINIMA_ANALISE = 15;

export function analisarProvas(questoes: QuestaoParaAnalise[], totalProvas: number): PerfilProva {
  const total = questoes.length;
  const anos = Array.from(new Set(questoes.map((q) => q.ano).filter((a): a is number => a != null))).sort();
  const bancas = Array.from(new Set(questoes.map((q) => q.banca).filter((b): b is string => !!b)));

  const contagemAssunto = new Map<string, number>();
  for (const q of questoes) {
    const chave = q.assunto || q.disciplina || "(não classificado)";
    contagemAssunto.set(chave, (contagemAssunto.get(chave) || 0) + 1);
  }
  const frequenciaAssunto = Array.from(contagemAssunto.entries())
    .map(([assunto, ocorrencias]) => ({
      assunto,
      ocorrencias,
      percentual: total > 0 ? Math.round((ocorrencias / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias);

  const tamanhoMedioEnunciado =
    total > 0 ? Math.round(questoes.reduce((s, q) => s + q.enunciado.length, 0) / total) : 0;

  const distribuicaoAlternativas: Record<number, number> = {};
  for (const q of questoes) {
    distribuicaoAlternativas[q.numero_alternativas] = (distribuicaoAlternativas[q.numero_alternativas] || 0) + 1;
  }

  const contagemTipo = new Map<string, number>();
  for (const q of questoes) {
    const tipo = q.tipo_raciocinio || "(não classificado)";
    contagemTipo.set(tipo, (contagemTipo.get(tipo) || 0) + 1);
  }
  const tiposRaciocinio = Array.from(contagemTipo.entries())
    .map(([tipo, ocorrencias]) => ({ tipo, ocorrencias }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias);

  const percentualComImagem =
    total > 0 ? Math.round((questoes.filter((q) => q.tem_imagem).length / total) * 1000) / 10 : 0;

  return {
    amostra: { totalQuestoes: total, totalProvas, anos, bancas },
    frequenciaAssunto,
    tamanhoMedioEnunciado,
    distribuicaoAlternativas,
    tiposRaciocinio,
    percentualComImagem,
    amostraSuficiente: total >= AMOSTRA_MINIMA_ANALISE,
  };
}
