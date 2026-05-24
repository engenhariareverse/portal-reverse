# Setup do módulo Prospecção — Google Sheets + Apps Script

Tempo estimado: **10 minutos**. Você só faz isso UMA VEZ.

---

## Pré-requisitos

- Conta Google (qualquer Gmail serve)
- O arquivo [`apps_script/Code.gs`](../apps_script/Code.gs) deste portal

---

## Passo 1 — Criar a planilha

1. Abra https://sheets.google.com e clique em **Em branco** (planilha nova).
2. Renomeie a planilha (canto superior esquerdo) para **`JOTEC Prospeccao`**.
3. Renomeie a aba (canto inferior, "Página1") para **`Prospeccao`** — **exatamente esse nome, sem acento**.

> Não precisa colar cabeçalhos nem nada. O script faz isso no Passo 3.

---

## Passo 2 — Colar o Apps Script

1. Na planilha, menu **Extensões → Apps Script**.
2. Vai abrir uma nova aba com um editor de código. Apague qualquer coisa que estiver lá (`function myFunction() {}`).
3. Abra o arquivo [`apps_script/Code.gs`](../apps_script/Code.gs) do portal, copie **TUDO**, e cole no editor.
4. Salve com **Ctrl+S** (ou ícone de disquete). Dê o nome **`JOTEC Prospeccao API`** ao projeto.

---

## Passo 3 — Rodar o setup inicial

Isso cria o cabeçalho, dropdowns de origem/status e cores.

1. No editor do Apps Script, no menu suspenso ao lado do botão "Executar", selecione **`setupPlanilha`**.
2. Clique **Executar** (▶).
3. Vai pedir autorização → **Revisar permissões** → escolha sua conta Google.
4. **Vai aparecer "O Google não verificou este app"** — é normal porque é seu script próprio. Clique:
   - **Avançado** (no canto inferior esquerdo)
   - **Acessar JOTEC Prospeccao API (não seguro)**
   - **Permitir**
5. A execução deve terminar em segundos. Volte para a planilha — você verá:
   - Cabeçalho dourado sobre preto
   - Aba `Prospeccao` com todas as colunas
   - Dropdowns funcionando nas colunas `origem` e `status`
   - Cores automáticas quando você muda o status

---

## Passo 4 — Implantar como App da Web (API)

1. No editor do Apps Script, canto superior direito: **Implantar → Novo deploy**.
2. Clique no ícone de engrenagem (⚙) ao lado de "Selecione o tipo" → escolha **App da Web**.
3. Preencha:
   - **Descrição:** `API JOTEC Prospeccao v1`
   - **Executar como:** `Eu (seu-email@gmail.com)` ← deixa assim
   - **Quem pode acessar:** `Qualquer pessoa` ← **importante**, senão o portal não consegue ler
4. Clique **Implantar**.
5. Vai aparecer uma janela com a **URL do app da Web** — é uma URL longa começando com `https://script.google.com/macros/s/...../exec`. **Copie ela** (botão de cópia).

> ⚠️ Guarde essa URL. Você vai colar ela na aba **Configurações** do módulo Prospecção do portal.

---

## Passo 5 — Testar a API direto no navegador

Abra essa URL no navegador, acrescentando `?action=ping` no final:

```
https://script.google.com/macros/s/.....SEU_ID...../exec?action=ping
```

Deve aparecer:
```json
{"ok":true,"version":"1.0.0"}
```

Se aparecer isso, **deu certo!** Sua API está no ar e gratuita.

Agora teste a lista (deve vir vazia se você ainda não tem contatos):
```
https://script.google.com/macros/s/.....SEU_ID...../exec?action=list
```

Resposta esperada:
```json
{"ok":true,"data":[]}
```

---

## Passo 6 — Configurar no Portal JOTEC

(Disponível a partir do Bloco 3 do plano — quando o módulo Prospecção estiver no portal)

1. Abrir Portal JOTEC → módulo **🎯 Prospecção** → aba **Configurações**
2. Colar a URL no campo **URL do Apps Script**
3. Clicar **Testar conexão** → deve aparecer "✅ Conectado"
4. Pronto. Use a aba **Lista** para começar a cadastrar.

---

## Atualizando o script no futuro

Se eu te entregar uma versão nova do `Code.gs`:

1. Abra a planilha → Extensões → Apps Script
2. Cole o conteúdo novo (substitui tudo)
3. **Implantar → Gerenciar deploys** → ícone de lápis (✏) no deploy existente → Versão **Nova versão** → Implantar
4. **A URL NÃO MUDA.** Não precisa reconfigurar o portal.

> Se você criar um deploy NOVO em vez de atualizar o existente, a URL muda e você terá que reconfigurar.

---

## Solução de problemas

**"Authorization required" ou erro 401 ao abrir a URL:**
→ No Passo 4, certifique-se de que escolheu **"Quem pode acessar: Qualquer pessoa"**, não "Qualquer pessoa com conta Google".

**Portal mostra "Erro de CORS":**
→ Apps Script já libera CORS automaticamente para apps Web "Qualquer pessoa". Isso geralmente significa que você publicou como "Qualquer pessoa com conta Google" em vez de "Qualquer pessoa". Refaça o Passo 4.

**`?action=list` retorna `{"ok":false,"error":"..."}`:**
→ Confira se a aba se chama exatamente `Prospeccao` (sem acento, P maiúsculo).

**Quero ver os dados que estão chegando do portal:**
→ No editor do Apps Script: **Execuções** (menu lateral esquerdo, ícone de relógio). Mostra cada chamada com payload e resposta.

**Quero limitar quem acessa a API:**
→ Versão atual deixa qualquer um ler/escrever se tiver a URL. Para a próxima versão dá pra adicionar um "token" simples (header `X-JOTEC-Token`). Pede pra mim quando precisar.

---

## Limites gratuitos do Google (você não vai chegar perto)

- **20.000 chamadas por dia** ao Apps Script Web App
- **6 minutos por execução** (operações da JOTEC levam < 1s)
- **Planilha:** até 10 milhões de células (muito mais que suficiente)
- **Custo:** R$ 0,00 — sempre
