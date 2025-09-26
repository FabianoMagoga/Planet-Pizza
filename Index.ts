// index.ts — Pizzaria (CLI) com comentários didáticos
// -----------------------------------------------------------------------------------
// Este arquivo é a sua aplicação original, mas com COMENTÁRIOS explicando cada parte.
// O comportamento do programa foi mantido exatamente igual.
// -----------------------------------------------------------------------------------

/*
 Como executar:
 1) npm i -D typescript @types/node ts-node && npm i readline-sync
 2) npx tsc --init (se ainda não existir tsconfig.json)
 3) npx ts-node index.ts   (ou: npx tsc && node dist/index.js)
*/

import readlineSync = require("readline-sync");
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ================= Tipos / Modelos =================
// -------------------------------------------------------------------------
// Os tipos abaixo definem os modelos usados ao longo do programa.
// Manter consistência aqui evita bugs nas funções e facilita evolução.
// -------------------------------------------------------------------------

type UUID = string;
type Categoria = "Pizza Salgadas" | "Bebida" | "Pizza Doces";
type FormaPg = "Dinheiro" | "Credito" | "Debito" | "Pix" | "Vale refeicao" | "Alimentacao";
type ModoPedido = "ENTREGA" | "RETIRADA";

// Estruturas principais de dados
interface Cliente { id: UUID; cpf: string; nome: string; telefone?: string; }
interface Produto { id: UUID; nome: string; categoria: Categoria; preco: number; ativo: boolean; }
interface Item { produtoId: UUID; qtd: number; nome: string; preco: number; cat: Categoria; }
interface Pedido {
  numero: number;                              // número sequencial do pedido (ex.: 0001, 0002...)
  clienteId?: UUID;                            // pode existir pedido sem cliente vinculado
  itens: Item[];
  subtotal: number;
  descontos: number;
  promocoesAplicadas: string[];                // descrição das promoções calculadas
  taxaEntrega: number;
  total: number;
  forma: FormaPg;
  criadoEm: string;                            // ISO string da data/hora do pedido
  modo: ModoPedido;
  entrega?: {                                  // informações opcionais de entrega
    endereco: string; numero: string; bairro?: string; cep?: string; referencia?: string;
  };
}

// ================ Persistência (arquivo JSON) ================
// -------------------------------------------------------------------------
// Armazenamos tudo em um único arquivo JSON (pizzaria-db.json) no diretório
// atual do processo. Duas sequências (seq, pedidoSeq) mantêm a numeração.
// -------------------------------------------------------------------------
const DB_PATH = path.join(process.cwd(), "pizzaria-db.json");

const db = {
  clientes: [] as Cliente[],
  produtos: [] as Produto[],
  pedidos: [] as Pedido[],
};

let seq = 1;        // gera IDs para clientes/produtos
let pedidoSeq = 1;  // gera números de pedido

// Lê o banco do disco, ajustando os contadores com base no conteúdo existente
function carregarDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      const data = JSON.parse(raw);
      if (data?.clientes) db.clientes = data.clientes;
      if (data?.produtos) db.produtos = data.produtos;
      if (data?.pedidos) db.pedidos = data.pedidos;

      // Ajuste da sequência com base no maior id numérico já criado
      const maxIdNum = Math.max(
        0,
        ...db.clientes.map(c => parseInt((c.id||"").split("_")[1]||"0", 10)),
        ...db.produtos.map(p => parseInt((p.id||"").split("_")[1]||"0", 10)),
      );
      seq = Number.isFinite(maxIdNum) ? (maxIdNum + 1) : 1;

      // Ajuste do número do pedido
      const maxPed = Math.max(0, ...db.pedidos.map(p => p.numero));
      pedidoSeq = Number.isFinite(maxPed) ? (maxPed + 1) : 1;
    }
  } catch (e) {
    console.warn("Falha ao carregar o banco. Iniciando vazio. Detalhe:", e);
  }
}

// Persiste o banco no disco (com metadados úteis para depuração)
function salvarDB() {
  try {
    const payload = { ...db, _meta: { seq, pedidoSeq, savedAt: new Date().toISOString() } };
    fs.writeFileSync(DB_PATH, JSON.stringify(payload, null, 2), "utf8");
  } catch (e) {
    console.error("Falha ao salvar o banco:", e);
  }
}

// ================ Utilidades =================
// Funções pequenas e reutilizáveis para ID, formatação e datas.
const nextId = (): UUID => `id_${seq++}`;
const nextPedidoNumero = () => pedidoSeq++;

const real = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dec = (n: number) => n.toFixed(2); // ponto decimal para CSV

// Formata uma ISO string para dd/mm/yyyy hh:mm
const fmtData = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};

const fmtPedido = (n: number, width = 4) => String(n).padStart(width, "0");

// Gera uma chave yyyy-mm-dd para agrupamentos por dia
const chaveDia = (iso: string) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

// Timestamp compacto para nomes de arquivos
const ts = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  const ss = String(d.getSeconds()).padStart(2,"0");
  return `${y}${m}${da}-${hh}${mi}${ss}`;
};

// === Regras de entrega/frete ===
// ENTREGA_GRATIS_MIN: valor mínimo para frete grátis
// TAXA_ENTREGA_BASE: taxa padrão quando bairro não é reconhecido
// TAXA_ENTREGA_POR_BAIRRO: overrides por bairro (já normalizados em minúsculas no cálculo)
const ENTREGA_GRATIS_MIN = 120.00;
const TAXA_ENTREGA_BASE = 8.00;
const TAXA_ENTREGA_POR_BAIRRO: Record<string, number> = {
  "centro": 6.00,
  "retiro": 6.00,
  "anhangabau": 8.00,
  "vila arens": 8.00,
  "vianelo": 7.00,
  "agasal": 12.00
};

// ==== Promoções (catálogo para consulta no menu de pesquisa) ====
const PROMOS_INFO: { nome: string; chave?: string; regra: string; obs?: string }[] = [
  { nome: "Terça Doce", regra: "10% de desconto nas Pizzas Doces às terças-feiras.", obs: "Aplica sobre os itens de Pizza Doces." },
  { nome: "Combo Pizza + Refri", regra: "R$ 5,00 de desconto se o pedido tiver pelo menos 1 Pizza e 1 Refrigerante." },
  { nome: "Cupom PLANET10", chave: "PLANET10", regra: "10% de desconto no subtotal usando o cupom PLANET10." },
  { nome: "Cupom PIX5", chave: "PIX5", regra: "R$ 5,00 de desconto no pagamento via Pix usando o cupom PIX5." },
  { nome: "Frete Grátis", regra: `Entrega grátis a partir de ${real(ENTREGA_GRATIS_MIN)} (aplica automaticamente).` }
];

// Helpers de normalização/validação
const soDigitos = (s: string) => s.replace(/\D/g, "");
const normalizeCpf = (s: string) => soDigitos(s);
const validaCpfBasico = (s: string) => normalizeCpf(s).length === 11;
const formatCpf = (digits: string) => {
  const d = normalizeCpf(digits).padStart(11, "0");
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};
function sanitizeText(text: string) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
const normalizeKey = (s?: string) => s ? sanitizeText(s).trim().toLowerCase() : "";

// ==== Entrada de dados (CLI) ====
// Leitura de quantidade inteira e positiva
function lerQuantidade(msg = "Qtd: "): number {
  while (true) {
    const raw = readlineSync.question(msg).trim().replace(",", ".");
    const qtd = Number(raw);
    if (Number.isInteger(qtd) && qtd > 0) return qtd;
    console.log("Quantidade invalida. Use numero inteiro (ex: 1, 2, 3).");
  }
}

// Leitura de campo obrigatório (não vazio)
function lerObrigatorio(msg: string): string {
  while (true) {
    const v = readlineSync.question(msg).trim();
    if (v) return v;
    console.log("Campo obrigatorio.");
  }
}

// Leitura de data no padrão BR (sem horário). Retorna null se inválida.
function lerDataBR(msg: string): Date | null {
  const s = readlineSync.question(msg).trim();
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

// === Coleta de dados de entrega ou retirada ===
function lerModoPedido(): {
  modo: ModoPedido;
  entrega?: { endereco: string; numero: string; bairro?: string; cep?: string; referencia?: string }
} {
  while (true) {
    const resp = readlineSync.question("Entrega (E) ou Retirada (R)? ").trim().toUpperCase();
    if (resp.startsWith("R")) return { modo: "RETIRADA" };
    if (resp.startsWith("E")) {
      const endereco   = lerObrigatorio("Endereco: ");
      const numero     = lerObrigatorio("Numero: ");
      const bairro     = readlineSync.question("Bairro (opcional, ajuda a calcular taxa): ").trim();
      const cep        = readlineSync.question("CEP (opcional): ").trim();
      const referencia = readlineSync.question("Ponto de referencia (opcional): ").trim();
      return { modo: "ENTREGA", entrega: { endereco, numero, bairro: bairro || undefined, cep: cep || undefined, referencia: referencia || undefined } };
    }
    console.log("Opcao invalida. Digite E para Entrega ou R para Retirada.");
  }
}

// Calcula a taxa com base no modo, subtotal e (opcionalmente) bairro
function calcularTaxaEntrega(modo: ModoPedido, entrega: Pedido["entrega"], subtotalPosDesc: number): number {
  if (modo !== "ENTREGA") return 0;
  if (subtotalPosDesc >= ENTREGA_GRATIS_MIN) return 0;
  const key = normalizeKey(entrega?.bairro);
  if (key && Object.prototype.hasOwnProperty.call(TAXA_ENTREGA_POR_BAIRRO, key)) {
    return TAXA_ENTREGA_POR_BAIRRO[key];
  }
  return TAXA_ENTREGA_BASE;
}

// ================= Promoções (cálculo real) =================
// Retorna as "linhas de desconto" aplicáveis e o total de descontos somado.
type LinhaDesc = { nome: string; valor: number };
function calcularDescontos(itens: Item[], subtotal: number, forma: FormaPg, cupom?: string): { linhas: LinhaDesc[]; total: number } {
  const linhas: LinhaDesc[] = [];
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0-dom ... 2-ter ...
  const hasPizza = itens.some(i => i.cat === "Pizza Salgadas");
  const hasBebida = itens.some(i => i.cat === "Bebida");
  const totalDoces = itens.filter(i => i.cat === "Pizza Doces").reduce((s, i) => s + i.preco * i.qtd, 0);

  // Terça Doce (10% só sobre os itens doces)
  if (diaSemana === 2 && totalDoces > 0) {
    linhas.push({ nome: "Terça Doce (10% nas Pizzas Doces)", valor: +(totalDoces * 0.10).toFixed(2) });
  }

  // Combo Pizza + Refri (desconto fixo)
  if (hasPizza && hasBebida) {
    linhas.push({ nome: "Combo Pizza + Refri", valor: 5.00 });
  }

  // Cupons
  const cup = (cupom ?? "").trim().toUpperCase();
  if (cup === "PLANET10") {
    linhas.push({ nome: "Cupom PLANET10 (10%)", valor: +(subtotal * 0.10).toFixed(2) });
  } else if (cup === "PIX5" && forma === "Pix") {
    linhas.push({ nome: "Cupom PIX5", valor: 5.00 });
  } else if (cup && !["PLANET10", "PIX5"].includes(cup)) {
    console.log("Cupom informado é inválido ou não aplicável — será ignorado.");
  }

  // Garante que o desconto não ultrapasse o subtotal
  const total = Math.min(subtotal, +linhas.reduce((s, l) => s + l.valor, 0).toFixed(2));
  return { linhas, total };
}

// ============ Exportação para CSV / Localização Desktop ============
// resolveDesktopPath: tenta detectar a pasta "Área de Trabalho" em Windows/OneDrive e Unix.
function resolveDesktopPath(): string | null {
  const candidates: string[] = [];
  for (const v of ["OneDrive", "OneDriveConsumer", "OneDriveCommercial"]) {
    const base = process.env[v];
    if (base) candidates.push(path.join(base, "Desktop"));
  }
  if (process.env.USERPROFILE) candidates.push(path.join(process.env.USERPROFILE, "Desktop"));
  candidates.push(path.join(os.homedir(), "Desktop"));
  if (process.env.USERPROFILE) candidates.push(path.join(process.env.USERPROFILE, "Área de Trabalho"));
  candidates.push(path.join(os.homedir(), "Área de Trabalho"));
  for (const p of candidates) {
    try { if (p && fs.existsSync(p) && fs.statSync(p).isDirectory()) return p; } catch {}
  }
  return null;
}

// Escapa campos com vírgula/aspas/quebra de linha para formato CSV
function csvEscape(s: string): string {
  const needsQuotes = /[",\n]/.test(s);
  let out = s.replace(/"/g, '""');
  return needsQuotes ? `"${out}"` : out;
}

// Salva um CSV no Desktop (quando possível) ou no diretório atual
function saveCSV(baseName: string, headers: string[], rows: (string|number)[][]): string {
  const desktopDir = resolveDesktopPath();
  const fname = `${baseName}-${ts()}.csv`;
  const targetDir = desktopDir ?? process.cwd();
  const filePath = path.join(targetDir, fname);

  const lines: string[] = [];
  lines.push(headers.map(h => csvEscape(h)).join(","));
  for (const r of rows) lines.push(r.map(v => csvEscape(String(v))).join(","));

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
  console.log(`\nArquivo CSV salvo em: ${filePath}`);
  return filePath;
}

// =================== Menus de navegação ===================
// menuPrincipal: orquestra os submenus do sistema.
function pause() { readlineSync.question("\nENTER para continuar..."); }

function menuPrincipal() {
  while (true) {
    console.clear();
    console.log("=== PLANET PIZZARIA ===");
    console.log("1) Clientes");
    console.log("2) Produtos");
    console.log("3) Novo Pedido");
    console.log("4) Listar Pedidos");
    console.log("5) Pesquisa/Relatórios");
    console.log("9) Salvar agora");
    console.log("0) Sair");
    const op = readlineSync.question("Escolha: ");
    if (op === "1") menuClientes();
    else if (op === "2") menuProdutos();
    else if (op === "3") fluxoPedido();
    else if (op === "4") listarPedidos();
    else if (op === "5") menuPesquisa();
    else if (op === "9") { salvarDB(); console.log("Banco salvo."); pause(); }
    else if (op === "0") { salvarDB(); process.exit(0); }
  }
}

// ---- Funções de relatório (exibição no terminal) ----
function isPizza(cat: Categoria) { return cat === "Pizza Salgadas" || cat === "Pizza Doces"; }

// Soma pizzas por data do pedido
function relPizzasVendidasPorDia() {
  const mapa = new Map<string, number>();
  for (const p of db.pedidos) {
    const qPizzas = p.itens.reduce((s, it) => s + (isPizza(it.cat) ? it.qtd : 0), 0);
    if (qPizzas > 0) {
      const k = chaveDia(p.criadoEm);
      mapa.set(k, (mapa.get(k) ?? 0) + qPizzas);
    }
  }
  const linhas = Array.from(mapa.entries()).sort((a,b) => a[0].localeCompare(b[0]));
  if (linhas.length === 0) { console.log("Sem vendas de pizza registradas."); return; }
  console.log("\n== PIZZAS VENDIDAS POR DIA ==");
  for (const [dia, qtd] of linhas) console.log(`${dia}: ${qtd} pizza(s)`);
}

// Estatística de um mês específico
function relPizzasVendidasNoMes() {
  const hoje = new Date();
  const mesStr = readlineSync.question(`Mes (1-12, ENTER=${hoje.getMonth()+1}): `).trim();
  const anoStr = readlineSync.question(`Ano (ENTER=${hoje.getFullYear()}): `).trim();
  const mes = mesStr ? Number(mesStr) : (hoje.getMonth() + 1);
  const ano = anoStr ? Number(anoStr) : hoje.getFullYear();
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 1970) {
    console.log("Mes/ano invalidos."); return;
  }

  let totalMes = 0;
  const porSabor = new Map<string, number>();
  const porDia = new Map<string, number>();

  for (const p of db.pedidos) {
    const d = new Date(p.criadoEm);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    if (m === mes && y === ano) {
      for (const it of p.itens) {
        if (isPizza(it.cat)) {
          totalMes += it.qtd;
          porSabor.set(it.nome, (porSabor.get(it.nome) ?? 0) + it.qtd);
          const k = chaveDia(p.criadoEm);
          porDia.set(k, (porDia.get(k) ?? 0) + it.qtd);
        }
      }
    }
  }

  console.log(`\n== PIZZAS VENDIDAS NO MES ${String(mes).padStart(2,"0")}/${ano} ==`);
  console.log(`Total: ${totalMes} pizza(s)`);
  if (totalMes === 0) return;

  console.log("\nTop sabores (até 10):");
  const sabores = Array.from(porSabor.entries()).sort((a,b) => b[1]-a[1]).slice(0,10);
  for (const [nome, qtd] of sabores) console.log(`- ${nome}: ${qtd}`);

  console.log("\nQuebra por dia:");
  const dias = Array.from(porDia.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
  for (const [dia, qtd] of dias) console.log(`${dia}: ${qtd}`);
}

// Faturamento agregado por dia
function relFaturamentoPorDia() {
  const mapa = new Map<string, number>();
  for (const p of db.pedidos) {
    const k = chaveDia(p.criadoEm);
    mapa.set(k, (mapa.get(k) ?? 0) + p.total);
  }
  const linhas = Array.from(mapa.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
  if (linhas.length === 0) { console.log("Sem faturamento registrado."); return; }
  console.log("\n== FATURAMENTO POR DIA ==");
  for (const [dia, total] of linhas) console.log(`${dia}: ${real(total)}`);
}

// Faturamento de um mês
function relFaturamentoPorMes() {
  const hoje = new Date();
  const mesStr = readlineSync.question(`Mes (1-12, ENTER=${hoje.getMonth()+1}): `).trim();
  const anoStr = readlineSync.question(`Ano (ENTER=${hoje.getFullYear()}): `).trim();
  const mes = mesStr ? Number(mesStr) : (hoje.getMonth() + 1);
  const ano = anoStr ? Number(anoStr) : hoje.getFullYear();
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 1970) {
    console.log("Mes/ano invalidos."); return;
  }

  let totalMes = 0;
  const porDia = new Map<string, number>();
  for (const p of db.pedidos) {
    const d = new Date(p.criadoEm);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    if (m === mes && y === ano) {
      totalMes += p.total;
      const k = chaveDia(p.criadoEm);
      porDia.set(k, (porDia.get(k) ?? 0) + p.total);
    }
  }

  console.log(`\n== FATURAMENTO ${String(mes).padStart(2,"0")}/${ano} ==`);
  console.log(`Total do mês: ${real(totalMes)}`);
  if (totalMes === 0) return;
  console.log("\nQuebra por dia:");
  const dias = Array.from(porDia.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
  for (const [dia, tot] of dias) console.log(`${dia}: ${real(tot)}`);
}

// Ranking de sabores em um período opcional
function relRankingSaboresPeriodo() {
  console.log("Informe o período (dd/mm/aaaa). Deixe em branco para não filtrar.");
  const di = lerDataBR("Data inicial: ");
  const df = lerDataBR("Data final: ");

  let dIni = di ? new Date(di) : null;
  let dFim = df ? new Date(df.getTime() + 24*60*60*1000 - 1) : null;

  const porSaborQtd = new Map<string, number>();
  const porSaborReceita = new Map<string, number>();
  let totalPizzas = 0;

  for (const p of db.pedidos) {
    const t = new Date(p.criadoEm).getTime();
    if (dIni && t < dIni.getTime()) continue;
    if (dFim && t > dFim.getTime()) continue;

    for (const it of p.itens) {
      if (isPizza(it.cat)) {
        totalPizzas += it.qtd;
        porSaborQtd.set(it.nome, (porSaborQtd.get(it.nome) ?? 0) + it.qtd);
        porSaborReceita.set(it.nome, (porSaborReceita.get(it.nome) ?? 0) + it.qtd * it.preco);
      }
    }
  }

  console.log("\n== RANKING DE SABORES POR PERÍODO ==");
  console.log(`Total de pizzas vendidas no período: ${totalPizzas}`);
  if (totalPizzas === 0) return;

  const ranking = Array.from(porSaborQtd.entries())
    .map(([nome, qtd]) => ({ nome, qtd, receita: porSaborReceita.get(nome) ?? 0 }))
    .sort((a,b)=> b.qtd - a.qtd)
    .slice(0, 15);

  console.log("\nTop sabores (até 15):");
  for (const r of ranking) {
    console.log(`- ${r.nome}: ${r.qtd} un. | Receita: ${real(r.receita)}`);
  }
}

// ---- Exportações CSV (usam as mesmas agregações) ----
function exportPizzasVendidasPorDiaCSV() {
  const mapa = new Map<string, number>();
  for (const p of db.pedidos) {
    const qPizzas = p.itens.reduce((s, it) => s + (isPizza(it.cat) ? it.qtd : 0), 0);
    if (qPizzas > 0) {
      const k = chaveDia(p.criadoEm);
      mapa.set(k, (mapa.get(k) ?? 0) + qPizzas);
    }
  }
  const linhas = Array.from(mapa.entries()).sort((a,b) => a[0].localeCompare(b[0]));
  if (linhas.length === 0) { console.log("Sem dados para exportar."); return; }
  saveCSV("pizzas_por_dia", ["data", "qtd_pizzas"], linhas.map(([dia, qtd]) => [dia, String(qtd)]));
}

function exportPizzasVendidasNoMesCSV() {
  const hoje = new Date();
  const mesStr = readlineSync.question(`Mes (1-12, ENTER=${hoje.getMonth()+1}): `).trim();
  const anoStr = readlineSync.question(`Ano (ENTER=${hoje.getFullYear()}): `).trim();
  const mes = mesStr ? Number(mesStr) : (hoje.getMonth() + 1);
  const ano = anoStr ? Number(anoStr) : hoje.getFullYear();
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 1970) {
    console.log("Mes/ano invalidos."); return;
  }

  const porSabor = new Map<string, number>();
  const porDia = new Map<string, number>();

  for (const p of db.pedidos) {
    const d = new Date(p.criadoEm);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    if (m === mes && y === ano) {
      for (const it of p.itens) {
        if (isPizza(it.cat)) {
          porSabor.set(it.nome, (porSabor.get(it.nome) ?? 0) + it.qtd);
          const k = chaveDia(p.criadoEm);
          porDia.set(k, (porDia.get(k) ?? 0) + it.qtd);
        }
      }
    }
  }

  if (porSabor.size === 0) { console.log("Sem dados para exportar."); return; }

  saveCSV(`pizzas_mes_${ano}-${String(mes).padStart(2,"0")}_por_dia`,
    ["data","qtd_pizzas"],
    Array.from(porDia.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([d,q])=>[d,String(q)])
  );
  saveCSV(`pizzas_mes_${ano}-${String(mes).padStart(2,"0")}_por_sabor`,
    ["sabor","qtd_pizzas"],
    Array.from(porSabor.entries()).sort((a,b)=> b[1]-a[1]).map(([s,q])=>[s,String(q)])
  );
}

function exportFaturamentoPorDiaCSV() {
  const mapa = new Map<string, number>();
  for (const p of db.pedidos) {
    const k = chaveDia(p.criadoEm);
    mapa.set(k, (mapa.get(k) ?? 0) + p.total);
  }
  const linhas = Array.from(mapa.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
  if (linhas.length === 0) { console.log("Sem dados para exportar."); return; }
  saveCSV("faturamento_por_dia", ["data","total"], linhas.map(([d,t])=>[d, dec(t)]));
}

function exportFaturamentoPorMesCSV() {
  const hoje = new Date();
  const mesStr = readlineSync.question(`Mes (1-12, ENTER=${hoje.getMonth()+1}): `).trim();
  const anoStr = readlineSync.question(`Ano (ENTER=${hoje.getFullYear()}): `).trim();
  const mes = mesStr ? Number(mesStr) : (hoje.getMonth() + 1);
  const ano = anoStr ? Number(anoStr) : hoje.getFullYear();
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 1970) {
    console.log("Mes/ano invalidos."); return;
  }

  const porDia = new Map<string, number>();
  for (const p of db.pedidos) {
    const d = new Date(p.criadoEm);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    if (m === mes && y === ano) {
      const k = chaveDia(p.criadoEm);
      porDia.set(k, (porDia.get(k) ?? 0) + p.total);
    }
  }
  if (porDia.size === 0) { console.log("Sem dados para exportar."); return; }
  saveCSV(`faturamento_mes_${ano}-${String(mes).padStart(2,"0")}_por_dia`,
    ["data","total"], Array.from(porDia.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([d,t])=>[d, dec(t)])
  );
}

function exportRankingSaboresPeriodoCSV() {
  console.log("Informe o período (dd/mm/aaaa). Deixe em branco para não filtrar.");
  const di = lerDataBR("Data inicial: ");
  const df = lerDataBR("Data final: ");
  let dIni = di ? new Date(di) : null;
  let dFim = df ? new Date(df.getTime() + 24*60*60*1000 - 1) : null;

  const porSaborQtd = new Map<string, number>();
  const porSaborReceita = new Map<string, number>();

  for (const p of db.pedidos) {
    const t = new Date(p.criadoEm).getTime();
    if (dIni && t < dIni.getTime()) continue;
    if (dFim && t > dFim.getTime()) continue;
    for (const it of p.itens) {
      if (isPizza(it.cat)) {
        porSaborQtd.set(it.nome, (porSaborQtd.get(it.nome) ?? 0) + it.qtd);
        porSaborReceita.set(it.nome, (porSaborReceita.get(it.nome) ?? 0) + it.qtd * it.preco);
      }
    }
  }
  if (porSaborQtd.size === 0) { console.log("Sem dados para exportar."); return; }
  const nomeBase = `ranking_sabores_${dIni?chaveDia(dIni.toISOString()):"inicio"}_${dFim?chaveDia(dFim.toISOString()):"fim"}`;
  const rows = Array.from(porSaborQtd.entries())
    .map(([nome, qtd]) => [nome, String(qtd), dec(porSaborReceita.get(nome) ?? 0)]);
  saveCSV(nomeBase, ["sabor","qtd","receita"], rows.sort((a,b)=> Number(b[1]) - Number(a[1])));
}

function exportHistoricoPorCPFCSV() {
  const cpfEntrada = readlineSync.question("CPF do cliente (apenas numeros): ").trim();
  if (!validaCpfBasico(cpfEntrada)) { console.log("CPF invalido."); return; }
  const cpf = normalizeCpf(cpfEntrada);
  const cli = db.clientes.find(c => c.cpf === cpf);
  if (!cli) { console.log("Cliente nao encontrado."); return; }

  const pedidos = db.pedidos.filter(p => p.clienteId === cli.id);
  if (pedidos.length === 0) { console.log("Cliente sem pedidos para exportar."); return; }

  const rows: (string|number)[][] = [];
  for (const p of pedidos) {
    const itensTxt = p.itens.map(i => `${i.qtd}x ${i.nome}`).join(" | ");
    rows.push([
      `#${fmtPedido(p.numero)}`,
      fmtData(p.criadoEm),
      p.modo,
      dec(p.subtotal),
      dec(p.descontos),
      dec(p.taxaEntrega),
      dec(p.total),
      p.forma,
      itensTxt
    ]);
  }
  saveCSV(`historico_${sanitizeText(cli.nome)}_${cpf}`, ["pedido","data","modo","subtotal","descontos","taxa_entrega","total","forma","itens"], rows);
}

// ---- Menu Pesquisa / Extras / Relatórios ----
function menuPesquisa() {
  console.clear();
  console.log("=== PESQUISA / EXTRAS / RELATORIOS ===");
  console.log("1) Buscar Promoções");
  console.log("2) Buscar Formas de Pagamento");
  console.log("3) Histórico de compras por CPF");
  console.log("4) Relatório: pizzas vendidas por dia");
  console.log("5) Relatório: pizzas vendidas no mês");
  console.log("6) Relatório: faturamento por dia");
  console.log("7) Relatório: faturamento por mês");
  console.log("8) Ranking de sabores por período");
  console.log("9) Exportar CSV: pizzas vendidas por dia");
  console.log("10) Exportar CSV: pizzas vendidas no mês");
  console.log("11) Exportar CSV: faturamento por dia");
  console.log("12) Exportar CSV: faturamento por mês");
  console.log("13) Exportar CSV: ranking de sabores (período)");
  console.log("14) Exportar CSV: histórico por CPF");
  console.log("0) Voltar");
  const op = readlineSync.question("Escolha: ").trim();

  if (op === "1") {
    // Busca simples por palavra-chave nas promoções
    const termo = readlineSync.question("Palavra-chave (ENTER = listar todas): ").trim().toLowerCase();
    const list = PROMOS_INFO.filter(p =>
      !termo ||
      p.nome.toLowerCase().includes(termo) ||
      (p.chave?.toLowerCase().includes(termo)) ||
      p.regra.toLowerCase().includes(termo)
    );
    if (list.length === 0) console.log("Nenhuma promocao encontrada.");
    else {
      console.log("\n== PROMOÇÕES ==");
      for (const p of list) {
        const cup = p.chave ? ` | Cupom: ${p.chave}` : "";
        const obs = p.obs ? ` | Obs: ${p.obs}` : "";
        console.log(`- ${p.nome}${cup}\n  Regra: ${p.regra}${obs}`);
      }
    }
    pause();

  } else if (op === "2") {
    // Lista formas aceitas (com filtro textual opcional)
    const formas: FormaPg[] = ["Dinheiro","Credito","Debito","Pix","Vale refeicao","Alimentacao"];
    const termo = readlineSync.question("Filtrar por termo (ENTER = todas): ").trim().toLowerCase();
    const list = formas.filter(f => !termo || f.toLowerCase().includes(termo));
    console.log("\n== FORMAS DE PAGAMENTO ACEITAS ==");
    for (const f of list) console.log("- " + f);
    pause();

  } else if (op === "3") {
    // Resumo de compras por CPF, incluindo últimos pedidos
    const cpfEntrada = readlineSync.question("CPF do cliente (apenas numeros): ").trim();
    if (!validaCpfBasico(cpfEntrada)) { console.log("CPF invalido."); pause(); return; }
    const cpf = normalizeCpf(cpfEntrada);
    const cli = db.clientes.find(c => c.cpf === cpf);
    if (!cli) { console.log("Cliente nao encontrado."); pause(); return; }
    const pedidos = db.pedidos.filter(p => p.clienteId === cli.id);
    if (pedidos.length === 0) { console.log("Cliente ainda nao possui pedidos."); pause(); return; }

    const gastoTotal = pedidos.reduce((s, p) => s + p.total, 0);
    console.log(`\n== HISTÓRICO DE ${cli.nome} (${formatCpf(cli.cpf)}) ==`);
    console.log(`Pedidos: ${pedidos.length} | Gasto total: ${real(gastoTotal)}`);
    console.log("\nÚltimos pedidos:");
    const ultimos = pedidos.slice(-5).reverse();
    for (const p of ultimos) {
      console.log(`- #${fmtPedido(p.numero)} | ${fmtData(p.criadoEm)} | ${real(p.total)} | ${p.modo}`);
      const itensTxt = p.itens.map(i => `${i.qtd}x ${i.nome}`).join(", ");
      console.log(`  Itens: ${itensTxt}`);
    }
    pause();

  } else if (op === "4") { relPizzasVendidasPorDia(); pause();
  } else if (op === "5") { relPizzasVendidasNoMes(); pause();
  } else if (op === "6") { relFaturamentoPorDia(); pause();
  } else if (op === "7") { relFaturamentoPorMes(); pause();
  } else if (op === "8") { relRankingSaboresPeriodo(); pause();
  } else if (op === "9") { exportPizzasVendidasPorDiaCSV(); pause();
  } else if (op === "10") { exportPizzasVendidasNoMesCSV(); pause();
  } else if (op === "11") { exportFaturamentoPorDiaCSV(); pause();
  } else if (op === "12") { exportFaturamentoPorMesCSV(); pause();
  } else if (op === "13") { exportRankingSaboresPeriodoCSV(); pause();
  } else if (op === "14") { exportHistoricoPorCPFCSV(); pause(); }
}

// =================== Clientes ===================
// CRUD simplificado (listagem + cadastro)
function menuClientes() {
  console.clear();
  console.log("=== CLIENTES ===");
  console.log("1) Listar");
  console.log("2) Cadastrar");
  console.log("0) Voltar");
  const op = readlineSync.question("Escolha: ");
  if (op === "1") {
    if (db.clientes.length === 0) console.log("Nenhum cliente.");
    for (const c of db.clientes) {
      console.log(`- ${c.nome} | CPF: ${formatCpf(c.cpf)} | Tel: ${c.telefone ?? "-"} | (id interno: ${c.id})`);
    }
  } else if (op === "2") {
    const nome = readlineSync.question("Nome: ").trim();
    if (!nome) { console.log("Nome obrigatorio."); pause(); return; }
    const cpfEntrada = readlineSync.question("CPF (apenas numeros): ").trim();
    if (!validaCpfBasico(cpfEntrada)) { console.log("CPF invalido."); pause(); return; }
    const cpf = normalizeCpf(cpfEntrada);
    if (db.clientes.some(c => c.cpf === cpf)) { console.log("Já existe cliente com esse CPF."); pause(); return; }
    const tel = readlineSync.question("Telefone (opcional): ").trim();
    const c: Cliente = { id: nextId(), cpf, nome, telefone: tel || undefined };
    db.clientes.push(c);
    console.log("OK! Cliente criado:", `${c.nome} — CPF: ${formatCpf(c.cpf)}`);
    salvarDB();
  }
  pause();
}

// =================== Produtos ===================
// Cadastro/ativação/desativação e listagem de itens do cardápio
function menuProdutos() {
  console.clear();
  console.log("=== PRODUTOS ===");
  console.log("1) Listar");
  console.log("2) Cadastrar");
  console.log("3) Ativar/Desativar");
  console.log("0) Voltar");
  const op = readlineSync.question("Escolha: ");
  if (op === "1") {
    if (db.produtos.length === 0) console.log("Nenhum produto.");
    for (const p of db.produtos) {
      console.log(`- ${p.id} | ${p.nome} | ${p.categoria} | ${real(p.preco)} | ativo=${p.ativo}`);
    }
  } else if (op === "2") {
    // Cadastro de produto novo
    const nome = readlineSync.question("Nome: ").trim();
    console.log("\nEscolha a categoria:");
    console.log("1) Pizza Salgadas");
    console.log("2) Pizza Doces");
    console.log("3) Bebida");
    const catOp = readlineSync.question("Opção: ").trim();
    let cat: Categoria;
    if (catOp === "1") cat = "Pizza Salgadas";
    else if (catOp === "2") cat = "Pizza Doces";
    else if (catOp === "3") cat = "Bebida";
    else { console.log("Opção invalida."); pause(); return; }
    const preco = Number(readlineSync.question("Preço (ex 39.9): ").replace(",", "."));
    if (!nome || !(preco > 0)) { console.log("Dados invalidos."); pause(); return; }
    const p: Produto = { id: nextId(), nome, categoria: cat, preco, ativo: true };
    db.produtos.push(p);
    console.log("OK! Produto criado:", p.id);
    salvarDB();
  } else if (op === "3") {
    // Alterna ativo/inativo para ocultar item do cardápio
    const id = readlineSync.question("ID do produto: ").trim();
    const p = db.produtos.find(x => x.id === id);
    if (!p) console.log("Produto não encontrado.");
    else { p.ativo = !p.ativo; console.log(`Produto agora ativo=${p.ativo}`); salvarDB(); }
  }
  pause();
}

// =================== Pedidos ===================
// Fluxo principal para montar e registrar um pedido
function escolherCategoria(): Categoria | undefined {
  console.log("\nCategorias:");
  console.log("1) Pizza Salgadas");
  console.log("2) Bebida");
  console.log("3) Pizza Doces");
  console.log("0) Finalizar itens");
  const op = readlineSync.question("Escolha a categoria: ").trim();
  if (op === "1") return "Pizza Salgadas";
  if (op === "2") return "Bebida";
  if (op === "3") return "Pizza Doces";
  if (op === "0") return undefined;
  console.log("Opção invalida.");
  return escolherCategoria();
}

// Mostra itens ativos por categoria e seleciona pelo número exibido
function escolherProdutoPorNumero(cat: Categoria): Produto | undefined {
  const lista = db.produtos.filter(p => p.ativo && p.categoria === cat);
  if (lista.length === 0) { console.log("Não há itens ativos nessa categoria."); return undefined; }
  console.log(`\n${cat.toUpperCase()} — Itens disponiveis:`);
  lista.forEach((p, i) => console.log(`${i + 1}) ${p.nome} — ${real(p.preco)}`));
  console.log("0) Voltar às categorias");
  const op = readlineSync.question("Escolha o numero do item: ").trim();
  if (op === "0") return undefined;
  const idx = Number(op);
  if (!Number.isInteger(idx) || idx < 1 || idx > lista.length) {
    console.log("Numero invalido.");
    return escolherProdutoPorNumero(cat);
  }
  return lista[idx - 1];
}

// Monta o pedido, aplica descontos, calcula total e salva
function fluxoPedido() {
  console.clear();
  console.log("=== NOVO PEDIDO ===");

  // Vinculação opcional de cliente por CPF
  let clienteId: UUID | undefined;
  const vinc = readlineSync.question("Vincular cliente? (s/n): ").toLowerCase();
  if (vinc.startsWith("s")) {
    if (db.clientes.length === 0) { console.log("Sem clientes. Cadastre primeiro."); pause(); return; }
    for (const c of db.clientes) console.log(`- ${c.nome} | CPF: ${formatCpf(c.cpf)}`);
    const cpfEntrada = readlineSync.question("Digite o CPF do cliente: ").trim();
    if (!validaCpfBasico(cpfEntrada)) { console.log("CPF inválido."); pause(); return; }
    const cpf = normalizeCpf(cpfEntrada);
    const cli = db.clientes.find(c => c.cpf === cpf);
    if (!cli) { console.log("Cliente não encontrado."); pause(); return; }
    clienteId = cli.id;
  }

  // Entrega/Retirada
  const { modo, entrega } = lerModoPedido();

  // Inclusão de itens até o usuário finalizar
  const itens: Item[] = [];
  while (true) {
    const cat = escolherCategoria();
    if (!cat) break;
    const prod = escolherProdutoPorNumero(cat);
    if (!prod) continue;
    const qtd = lerQuantidade(`Qtd de "${prod.nome}": `);
    itens.push({ produtoId: prod.id, qtd, nome: prod.nome, preco: prod.preco, cat: prod.categoria });
    console.log(`Adicionado: ${qtd}x ${prod.nome} (${real(prod.preco)} cada).`);
  }
  if (itens.length === 0) { console.log("Sem itens."); pause(); return; }

  // Seleção de forma de pagamento
  console.log("\nFormas de pagamento:");
  const formas: FormaPg[] = ["Dinheiro","Credito","Debito","Pix","Vale refeicao","Alimentacao"];
  formas.forEach((f, i) => console.log(`${i + 1}) ${f}`));
  const opPg = Number(readlineSync.question("Escolha o numero: ").trim());
  if (!Number.isInteger(opPg) || opPg < 1 || opPg > formas.length) {
    console.log("Opção invalida."); pause(); return;
  }
  const forma = formas[opPg - 1];

  const cupom = readlineSync.question("Tem cupom promocional? (ENTER p/ pular): ").trim();

  // Cálculo financeiro
  const subtotal = itens.reduce((s, it) => s + it.preco * it.qtd, 0);
  const { linhas: linhasDesc, total: totalDesc } = calcularDescontos(itens, subtotal, forma, cupom);
  const taxaEntrega = calcularTaxaEntrega(modo, entrega, subtotal - totalDesc);
  const total = Math.max(0, subtotal - totalDesc + taxaEntrega);

  // Montagem do objeto Pedido + persistência
  const ped: Pedido = {
    numero: nextPedidoNumero(),
    clienteId,
    itens,
    subtotal,
    descontos: totalDesc,
    promocoesAplicadas: linhasDesc.map(l => `${l.nome} (-${real(l.valor)})`),
    taxaEntrega,
    total,
    forma,
    criadoEm: new Date().toISOString(),
    modo,
    entrega
  };
  db.pedidos.push(ped);
  salvarDB();

  // Comprovante/recibo em TXT (também impresso no terminal)
  imprimirRecibo(ped);
  console.log(`\n== Pedido OK ==  Pedido: #${fmtPedido(ped.numero)}  Total: ${real(ped.total)}  Pgto: ${forma}`);
  pause();
}

// Gera e salva o recibo (TXT) no Desktop quando encontrado
function imprimirRecibo(p: Pedido) {
  const linhas: string[] = [];
  linhas.push("===== RECIBO =====");
  linhas.push(`Pedido: #${fmtPedido(p.numero)}`);
  linhas.push(`Data: ${fmtData(p.criadoEm)}`);
  if (p.clienteId) {
    const c = db.clientes.find(x => x.id === p.clienteId);
    if (c) linhas.push(`Cliente: ${c.nome} — CPF: ${formatCpf(c.cpf)}`);
  }
  linhas.push(`Modo: ${p.modo}`);
  if (p.modo === "ENTREGA" && p.entrega) {
    const addr = [`Endereco: ${p.entrega.endereco}, ${p.entrega.numero}`];
    if (p.entrega.bairro) addr.push(`Bairro: ${p.entrega.bairro}`);
    if (p.entrega.cep) addr.push(`CEP: ${p.entrega.cep}`);
    linhas.push(addr.join(" | "));
    if (p.entrega.referencia) linhas.push(`Referencia: ${p.entrega.referencia}`);
  } else {
    linhas.push("Retirada no balcao");
  }
  linhas.push("--------------------------------");
  for (const it of p.itens) {
    linhas.push(`${it.qtd}x ${it.nome} @ ${real(it.preco)} = ${real(it.qtd * it.preco)}`);
  }
  linhas.push("--------------------------------");
  linhas.push(`SUBTOTAL: ${real(p.subtotal)}`);

  if (p.promocoesAplicadas.length > 0) {
    linhas.push("DESCONTOS:");
    for (const d of p.promocoesAplicadas) linhas.push(" - " + d);
    linhas.push(`TOTAL DESCONTOS: -${real(p.descontos)}`);
  } else {
    linhas.push("DESCONTOS: (nenhum)");
  }

  if (p.taxaEntrega > 0) {
    linhas.push(`Taxa de entrega: ${real(p.taxaEntrega)}`);
  } else if (p.modo === "ENTREGA") {
    linhas.push(`Entrega GRÁTIS (acima de ${real(ENTREGA_GRATIS_MIN)})`);
  }

  linhas.push(`TOTAL: ${real(p.total)}`);
  linhas.push(`Pgto: ${p.forma.toUpperCase()}`);
  linhas.push("Obrigado Pela Preferencia !");

  console.log("\n" + linhas.join("\n"));

  const desktopDir = resolveDesktopPath();
  const fileName = `cupom-${fmtPedido(p.numero)}.txt`;
  const targetDir = desktopDir ?? process.cwd();
  const filePath = path.join(targetDir, fileName);

  try {
    const textoSanitizado = sanitizeText(linhas.join("\n"));
    fs.writeFileSync(filePath, textoSanitizado, "utf8");
    if (desktopDir) console.log(`\nCupom fiscal salvo na Área de Trabalho: ${filePath}`);
    else { console.warn("\nNão encontrei a pasta Desktop. O cupom foi salvo no diretório atual:"); console.log(filePath); }
  } catch (err) {
    console.error("Falha ao salvar o cupom. Caminho tentado:", filePath);
  }
}

// =================== Listagem de pedidos ===================
function listarPedidos() {
  console.clear();
  console.log("=== PEDIDOS ===");
  if (db.pedidos.length === 0) console.log("Nenhum pedido.");
  for (const p of db.pedidos) {
    const cli = p.clienteId ? db.clientes.find(c => c.id === p.clienteId) : undefined;
    const nome = cli?.nome ?? "-";
       const cpf = cli ? formatCpf(cli.cpf) : "-";
    const taxaTxt = p.taxaEntrega > 0 ? ` + taxa ${real(p.taxaEntrega)}` : (p.modo === "ENTREGA" ? " (frete grátis)" : "");
    const descTxt = p.descontos > 0 ? ` | desc: -${real(p.descontos)}` : "";
    console.log(`- #${fmtPedido(p.numero)} | ${fmtData(p.criadoEm)} | modo: ${p.modo} | cliente: ${nome} (${cpf}) | itens: ${p.itens.length} | total: ${real(p.total)}${taxaTxt}${descTxt}`);
  }
  pause();
}

// =================== Bootstrap (carga inicial) ===================
carregarDB();

// Se o cardápio estiver vazio, popular com alguns itens padrão
if (db.produtos.length === 0) {
  db.produtos.push(
    // Pizzas Salgadas
    { id: nextId(), nome: "4 Queijos", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "5 Queijos", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Americana", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Atum", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Brócolis", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Calabresa", categoria: "Pizza Salgadas", preco: 42.9, ativo: true },
    { id: nextId(), nome: "Calabresa com Cheddar", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Calabresa com Queijo", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Chicago", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Doritos", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Frango com Bacon", categoria: "Pizza Salgadas", preco: 43.9, ativo: true },
    { id: nextId(), nome: "Frango com Catupiry", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Frango com Catupiry e Bacon", categoria: "Pizza Salgadas", preco: 50.9, ativo: true },
    { id: nextId(), nome: "Frango com Cheddar", categoria: "Pizza Salgadas", preco: 42.9, ativo: true },
    { id: nextId(), nome: "La Bonissima", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Moda da Casa", categoria: "Pizza Salgadas", preco: 54.9, ativo: true },
    { id: nextId(), nome: "Moda do Chefe", categoria: "Pizza Salgadas", preco: 49.9, ativo: true },
    { id: nextId(), nome: "Mussarela", categoria: "Pizza Salgadas", preco: 39.9, ativo: true },
    { id: nextId(), nome: "Portuguesa", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Strogonoff", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Toscana", categoria: "Pizza Salgadas", preco: 47.9, ativo: true },

    // Bebidas
    { id: nextId(), nome: "Água Mineral 500ml", categoria: "Bebida", preco: 4.0, ativo: true },
    { id: nextId(), nome: "Cerveja 600ml", categoria: "Bebida", preco: 12.5, ativo: true },
    { id: nextId(), nome: "Cerveja Lata", categoria: "Bebida", preco: 6.5, ativo: true },
    { id: nextId(), nome: "Cerveja Long Neck", categoria: "Bebida", preco: 8.5, ativo: true },
    { id: nextId(), nome: "Refrigerante 1L", categoria: "Bebida", preco: 12.0, ativo: true },
    { id: nextId(), nome: "Refrigerante 2L", categoria: "Bebida", preco: 14.0, ativo: true },
    { id: nextId(), nome: "Refrigerante 600ml", categoria: "Bebida", preco: 8.0, ativo: true },
    { id: nextId(), nome: "Refrigerante Lata", categoria: "Bebida", preco: 6.0, ativo: true },
    { id: nextId(), nome: "Suco 300ml - Sabores", categoria: "Bebida", preco: 7.5, ativo: true },

    // Pizzas Doces
    { id: nextId(), nome: "Pizza Doces (Banana Caramelizada)", categoria: "Pizza Doces", preco: 44.9, ativo: true },
    { id: nextId(), nome: "Pizza Doces (Beijinho)", categoria: "Pizza Doces", preco: 32.9, ativo: true },
    { id: nextId(), nome: "Pizza Doces (Chocolate)", categoria: "Pizza Doces", preco: 39.9, ativo: true },
    { id: nextId(), nome: "Pizza Doces (Chocolate com Banana)", categoria: "Pizza Doces", preco: 45.9, ativo: true },
    { id: nextId(), nome: "Pizza Doces (Chocolate com Morango)", categoria: "Pizza Doces", preco: 47.9, ativo: true },
    { id: nextId(), nome: "Pizza Doces (Confete)", categoria: "Pizza Doces", preco: 40.9, ativo: true },
    { id: nextId(), nome: "Pizza Doces (Cream Cookies)", categoria: "Pizza Doces", preco: 50.9, ativo: true },
    { id: nextId(), nome: "Pizza Doces (Doce de Leite)", categoria: "Pizza Doces", preco: 34.9, ativo: true },
    { id: nextId(), nome: "Pizza Doces (Prestigio)", categoria: "Pizza Doces", preco: 46.9, ativo: true },
    { id: nextId(), nome: "Pizza Doces (Romeu e Julieta)", categoria: "Pizza Doces", preco: 45.9, ativo: true },
  );
  salvarDB();
}

// start do app
menuPrincipal();
