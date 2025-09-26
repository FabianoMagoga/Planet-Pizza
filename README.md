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

Os diagramas estão na pasta `diagrams/` e foram feitos no [Draw.io]

1. **Estrutura de Dados** → Entidades: Cliente, Produto, Pedido, Item.  ([https://viewer.diagrams.net/](tags=%7B%7D&lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1&title=Estrutura_de_Dados_Complexa.drawio&dark=auto#R%3Cmxfile%3E%3Cdiagram%20id%3D%22derX%22%20name%3D%22Estrutura%20de%20Dados%20(Complexa)%22%3EzZnJjuM2EIafxsDk0IYWr8eMx7MAmSVoBJOcDLZUlplIpEKVvOTpQ1klaqG62%2Bj2jHwyWaQo8aufVUV45K%2BS4wfF0t1nGUI88pzwOPLfjTzPnXgz%2FVNYTqVlMVmWhkjxkCbVhnv%2BH5DRIWvOQ8haE1HKGHnaNgZSCAiwZWNKyUN72lbG7bemLALLcB%2Bw2LZ%2B5yHuaBfevLZ%2FBB7tqje7M9pfwqrJtJNsx0J5aJj89chfKSmxbCXHFcQFvIpL%2Bdz7R0bNhykQeMkDQczLR%2FYszml3q5jrp2FUeMnXyP23era30pOETKBsBem2bCDEsJWCzJAwHtPO8FThUjIXIRRvdPVihx1HuE9ZUIwetEC0bYdJTMP2DmhTe1AIx4aJdvQB9FehOukpNDohuKSuGXUPtasM%2F13DTUuyMVJHZBauAeoGMeznCSK0eK715hUEsgdoUKLeVH2VMyKdJ6Bk2X5gXFXtgIcsJNg5uSCAlHzBU3lr8D2nh%2F6sh77rXgF%2FCjb%2BbxDy8BL4IUOin8iQeGfIMM8Gh%2BrPhpM0x9Ri%2BgkheZRreh4wWFMlwxzr%2Fr9oBvSh2OSCI7HOH1AiGz5%2BzLw2bXf5UzWsedkiLiH2qZghRFJxtrGjdFqGnaLJkO%2BHDw4LKzr8PB1rUHaqq%2BA9muwGBuY60w4x30bmLnqQLa4hRRbZSmQRS%2FSGLjj5W6kSiqh6AanaIfWcsRQTGQuY3MARB4fdjbJ%2BX5j9Yee%2B%2BG67dEAFUZ86O6iBaoxG1IU9z5isU9sGxJ63%2B7T4DSW6TnyY9gQIvy9AuN4VPKBcywGmFnbc8VjonyrrdThBqC8I1JUKdzKSgsXr2vpWe%2BjX4uqhJzzEMvinNL3n8bP0MpmrADr1OjIVAXaqnuIrnqSsIC4SQfsa8ypk3vPI6vr3lqCZSn0AaL4dVUlWFbNmgTUQNaOqJjVTDA5AbWJRa1JyxHjsFge0qpQGwmYItU6oqekG4Da11VYxqqA16qCh1GYINbmZmm0AbLMnD%2BlZanUpdEtn1FRtz0KjpOuMHW85aSVel0RzMdbz4npH7NSYkEouMGu8%2B1thaGT7eae4nU6bLrLmz5wn5%2BtG%2BQWdp6vPkdttBmiJwAC5TBfzx3XhlLowVdstqcKUl5eq4s4Zu05HFncv08WPcsXCckVda1ShzTjDeRNChlzIXwZzjKk5Xu0Yb9r2y9x7nV%2BqpTsH8m46by9xFb8t%2F8jE9vfPa%2B%2Fjl%2B%2Fi6%2Fx%2Be4zhzn2BV%2BrbSXE1quf8JmVKfvkbEE%2F0DwIrcl7rxgJHjn8Wj4%2Bn1PurMfLuSCufOyfq9Drrhfmtsl4%2Fn%2Blu%2FS9C6aP6vxh%2F%2FT8%3D%3C%2Fdiagram%3E%3C%2Fmxfile%3E).)
   
2. **Fluxo de Pedido** → Passo a passo: escolher cliente → selecionar modo → incluir itens → definir pagamento → gerar recibo.
([https://app.diagrams.net/](https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&target=blank&highlight=0000ff&edit=diagrama%20do%20fluxo%20de%20pedidos&layers=1&nav=1&title=Fluxo_Pedidos_Pizzaria.drawio&dark=auto#R%3Cmxfile%3E%3Cdiagram%20id%3D%22pizzaria%22%20name%3D%22Fluxo%20de%20Pedidos%22%3E3Zxdc5s4FIZ%2FjWe6F9sxCDBcJo7ddmZ3J5Nk2msZZFstIEbIsZNfvxJIGJDy0RSbKOlMaw4Ci0dHR%2Bc9opmAeXb4QmGx%2FZckKJ240%2BQwAVcT13VcN%2BD%2FCMuDtEz9aW3ZUJzUtpbhFj8i1VBadzhBZachIyRluJBGpzbGJM9RzDoNIaVk3712TdKkc10BN6jTQhhuY5girdkPnLCttAbTVvOvCG%2B2TPVbncmgai0N5RYmZN8ygcUEzCkhrP6UHeYoFfi6YJZPnG16RlHOXnMBqC%2B4h%2BlOPty3fDIHk4urGBPZRfagHpxfyxnzg8v9FjN0W8BYnNnzcea2LctSfuTwj7AsavBrfED8qy71fsmu3iPK0KFlkv38gkiGGH3gTeRZT0Hct5grjtsW7kANtRzmTXOrIwj%2BQbIwc%2FF0LgnvOl7jGFJ%2BYp5ifoj4p0%2Fz6yW%2FG0MpWpMc%2FaVBo2SXJwLC1fRlcNwfCnEmO2zE5Pm8Tsk%2B3kLKPheUxKgsB2I5k4yaKWhgGxrYzgZg62tsjzTRAZes%2BgyWOsktyVa78mWKAxDy%2B4RCA6HAQCgcgFCgE4IJLBnt%2Bp4FjuZ4XYwuOKOjzTSMGjOFoSBYPONlgSjm34Mot8lod300DeJY0y4RAAZ40lB70lsej3gIzyuP%2BcanVCliVYEfH%2Fn3uPyG0xVa4UQdlGRFUYZKWNoRwPyeXwFf9yv3VNMz0hcHCTgmlCJGytGjl%2Bd18HjBGaOXStNafC5%2B7krWdkULXKzJ0RRD55UMhwhdjqMxvMMFEVmzWCavUYITPT97jxg9EHUw%2Bn54RoyuhnGRM4o2kBvJjv91gximfHEde8YGQdfbmvyjHdCmBkzREJh0GTAn%2BRrTrJqzC%2B5UFFWyYGaH081Al2YQvZLmIE6ni4c5TONdWsG8gweopnHjixYgDXsOOjMkxK5Jjg2CVNcMV2iNcyyIfiW08k2H4iZANtPaBrSg762eHiJPh1YXG0vCJ36z1MANzPizCbSfrvGhzhfnHEIFHZDacIVz3jMqj77f8K%2F9fmFHLtks7MqzDbkkMAWLQZIlXaS0iUP%2BpPeQL%2FVjJ5Qh6DAKI0dfxU06bpDlSZc3d%2FxRqnCaczyZLB6IG4plnevkiSjrVV5sgQM6oJutR4ZqjOudav7raqa99luUafq9TNOZqlLTOYoNKj63JzJF%2FIFqjEJ420GxJ3scxxAOT0dR1z0ySbLMGUO%2Fj9EkH0%2BGUdc9xxprnRudnuIap%2BmcpIRW9wdrX%2FwRdpKzlr3%2BEfdklPxCrTNB9TOQmg%2F74%2BEZxuNUOtSwz7LIMKvS1xsU45Xu1E8TTki8yyoSZ1j4tZ0C11QIP5kf61Lqgu1gih9hjS6FVRp6CXjuX1U471FeFTWnBREtEgzrjFRVPo%2F2gZJTEeHTFKWED1M2kB6Iesw9UzHAxHyIjNSwP7PEmQZr1L3APiDfoO9PtjeotmfaMJINupWHhLIt2ZAcpouj9bLrW8c2%2FxBSSFA%2FEWMPcrcb7nj638HI%2FfpC7F3zw1VK4l%2B1aYnTFyd7SXY0lh2VcYjnzhskW8kpJh7hWfRUTDZ8jzr3%2FiOOM3s5ejpHfzSOht0f04S1ha2vs52NxlZXR%2F81dY8PBDgYC7AqfdnIMXhHjgoceznOdI7haBxdezmGOsdoNI664rF6UYp0tmqPdgS4uiyyf1UyEZ6ORti3F6SidtJ4Wl3KOwsfWg2qt6jK1p2vq9eqjsK2%2F%2B5TBHqDUt%2FxOERN1143ahYrMxVNOv7vjub%2F%2BrbUU5vV9hB2DYTBaIRDi0kaygjOaHUEoGu0J7f%2F7UFsctbRSgyexSrNMdRqnNH0rmexTnMMhYMRSVqs1BxD6cAZvHbwphzN773nFQbhoDma98GEoWOoXjijyW7vIypDI%2BLXKhrpxn%2Br4PV7s%2Bc4PVQTsl6XvBP9MfnNSWCzvDSUmYZfBd4Uu9z%2BO6rRtDdQfxi7bNaXhvqKO1p9xdP15e1zb0Rbg9k1FF9UuxEwm%2F5j2OSZ16Pt5jxaucSLLCZpKDy5g5dF3hTPo%2F67iECu4kMFdN9iXau8%2FR2OGwhOPW4Wq2jTOzjjvYTjW6yiTW%2FhnO01HH54%2FDUdtQsff90JWPwP%3C%2Fdiagram%3E%3C%2Fmxfile%3E))
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
