export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "debito"
  | "credito"
  | "credito_parcelado"
  | "boleto"
  | "transferencia";

export const formasPagamento: { value: FormaPagamento; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Cartão de Débito" },
  { value: "credito", label: "Cartão de Crédito" },
  { value: "credito_parcelado", label: "Crédito Parcelado" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

export const formaPagamentoLabel: Record<FormaPagamento, string> =
  Object.fromEntries(formasPagamento.map((f) => [f.value, f.label])) as Record<FormaPagamento, string>;
