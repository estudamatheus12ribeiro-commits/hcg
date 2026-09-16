import Anthropic from "@anthropic-ai/sdk";

export const MODELO_PADRAO = "claude-sonnet-5";

export function iaDisponivel(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cliente: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!iaDisponivel()) {
    throw new Error("ANTHROPIC_API_KEY não configurada — recursos de IA desativados.");
  }
  cliente ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cliente;
}

// Custo aproximado (USD por 1M tokens) só para estimativa exibida ao usuário —
// não é uma promessa de preço, apenas referência de ordem de grandeza.
const CUSTO_POR_MILHAO_USD = { entrada: 3, saida: 15 };

export function estimarCustoUsd(tokensEntrada: number, tokensSaida: number): number {
  return (
    (tokensEntrada / 1_000_000) * CUSTO_POR_MILHAO_USD.entrada +
    (tokensSaida / 1_000_000) * CUSTO_POR_MILHAO_USD.saida
  );
}
