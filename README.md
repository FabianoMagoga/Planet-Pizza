# 🍕 Planet Pizzaria (CLI em TypeScript)

Aplicação simples em linha de comando para gestão de uma pizzaria:
- Cadastro de clientes
- Cadastro e ativação/desativação de produtos
- Criação de pedidos (entrega ou retirada)
- Emissão de recibos (.txt) salvos na Área de Trabalho

---

## 🚀 Instalação e Execução

### Pré-requisitos
- [Node.js](https://nodejs.org/) (>= 18)
- npm (instalado junto com o Node)

### Passos
1. Clone este repositório:
   ```bash
   git clone https://github.com/SEU-USUARIO/planet-pizzaria.git
   cd planet-pizzaria
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Compile e rode:
   ```bash
   npx ts-node src/index.ts
   ```
   ou:
   ```bash
   npx tsc
   node dist/src/index.js
   ```

---

## 📂 Estrutura do Projeto

- `src/index.ts`: código principal (menus, clientes, produtos, pedidos).
- `diagrams/`: diagramas em `.drawio` ou `.xmind`.
- `package.json`: dependências e scripts.
- `tsconfig.json`: configuração TypeScript.

---

## 📦 Dependências

- `typescript` (dev)
- `@types/node` (dev)
- `ts-node` (dev)
- `readline-sync`

---

## 📊 Diagramas

Os diagramas estão na pasta `diagrams/` e foram feitos no [Draw.io](https://app.diagrams.net/) (também podem ser abertos no Xmind):

1. **Casos de Uso** → Mostra os atores (Cliente, Atendente) e funcionalidades (Cadastrar, Pedir, Listar).
2. **Estrutura de Dados** → Entidades: Cliente, Produto, Pedido, Item.
3. **Fluxo de Pedido** → Passo a passo: escolher cliente → selecionar modo → incluir itens → definir pagamento → gerar recibo.

---

## ✨ Funcionalidades

- Cadastro de clientes com CPF validado.
- Cadastro de produtos em 3 categorias: Pizza Salgada, Pizza Doce, Bebida.
- Pedidos com número sequencial, subtotal, taxa de entrega (tabela por bairro e frete grátis acima de R$ 120).
- Recibo salvo automaticamente na Área de Trabalho (ou diretório atual).

---

## 👨‍💻 Como contribuir

1. Fork este repositório.
2. Crie uma branch (`git checkout -b minha-feature`).
3. Commit suas alterações (`git commit -m "feat: minha feature"`).
4. Push para a branch (`git push origin minha-feature`).
5. Abra um Pull Request.

---

## 📜 Licença

MIT
