# Deploy no GitHub Pages — Portal JOTEC

Este tutorial coloca o Portal JOTEC numa URL pública gratuita acessível do celular (e de qualquer dispositivo com internet), sem precisar de servidor.

**Tempo estimado:** 15–20 minutos (se for o primeiro deploy).

---

## Pré-requisitos

- Conta no GitHub (gratuita): [github.com/signup](https://github.com/signup)
- Git instalado no seu computador (verifique com `git --version` no terminal)
- Pasta `JOTEC_Portal/` na sua máquina

---

## Passo 1 — Criar o repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Preencha:
   - **Repository name:** `jotec-portal` (tudo minúsculo, sem espaço)
   - **Description:** Portal de gestão JOTEC Soluções
   - **Visibility:** Public *(obrigatório para GitHub Pages grátis)*
   - **NÃO marque** "Add a README file" (já temos um)
3. Clique em **Create repository**
4. Guarde a URL do repositório: `https://github.com/SEU_USUARIO/jotec-portal`

---

## Passo 2 — Inicializar o Git na pasta local

Abra o terminal (PowerShell ou CMD) e navegue até a pasta do portal:

```powershell
cd "C:\Users\jpoli\OneDrive\Área de Trabalho\CLAUDE_JOTEC\JOTEC_Portal"
```

Inicialize o repositório Git:

```bash
git init
git add .
git commit -m "feat: portal JOTEC inicial com módulo Prospecção"
```

Conecte ao GitHub e faça o primeiro push:

```bash
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/jotec-portal.git
git push -u origin main
```

> **Nota:** Substitua `SEU_USUARIO` pelo seu usuário do GitHub.  
> Na primeira vez, o Git pode pedir login. Use seu usuário e um **Personal Access Token** (veja Passo 2b).

---

## Passo 2b — Gerar Personal Access Token (se solicitado)

O GitHub não aceita mais senha no terminal — usa tokens:

1. GitHub → clique na foto de perfil → **Settings**
2. No menu lateral esquerdo, role até o final: **Developer settings**
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
4. Preencha:
   - **Note:** `jotec-portal-deploy`
   - **Expiration:** 90 days (ou sem expiração, sua escolha)
   - **Scopes:** marque apenas `repo` (acesso completo a repositórios)
5. Clique em **Generate token**
6. **Copie o token agora** — ele não aparece de novo!
7. Use esse token como senha quando o Git pedir no terminal

---

## Passo 3 — Ativar o GitHub Pages

1. No GitHub, acesse o repositório `jotec-portal`
2. Clique em **Settings** (aba superior, não o menu do perfil)
3. No menu lateral: **Pages**
4. Em **Source**, selecione:
   - **Branch:** `main`
   - **Folder:** `/ (root)`
5. Clique em **Save**
6. Aguarde 1–3 minutos

Sua URL será: `https://SEU_USUARIO.github.io/jotec-portal/`

O GitHub Pages mostra um banner verde quando a publicação estiver pronta.

---

## Passo 4 — Testar no celular

1. Acesse `https://SEU_USUARIO.github.io/jotec-portal/` no celular
2. O portal deve abrir normalmente
3. **Adicionar à tela inicial (PWA):**
   - **Android (Chrome):** menu dos 3 pontinhos → "Adicionar à tela inicial"
   - **iPhone (Safari):** botão compartilhar → "Adicionar à tela de início"
4. O ícone da JOTEC aparece na tela inicial e o portal abre como app (sem barra do navegador)

---

## Passo 5 — Configurar o módulo Prospecção no celular

1. Abra o portal pelo celular
2. Acesse **Prospecção → Configurações**
3. Cole a URL do seu Apps Script (do [SETUP_PROSPECCAO.md](SETUP_PROSPECCAO.md))
4. Clique em **Testar conexão** → deve aparecer ✅
5. Clique em **Re-sincronizar tudo** para baixar os leads

A configuração fica salva no IndexedDB do celular. Na próxima vez que abrir, já funciona.

> **Privacidade:** o repositório GitHub só tem o código — **nenhum dado de leads** é enviado para o GitHub. Os dados ficam no Google Sheets (que só você acessa) e no IndexedDB do navegador.

---

## Como atualizar o portal depois

Sempre que fizer melhorias, basta:

```bash
cd "C:\Users\jpoli\OneDrive\Área de Trabalho\CLAUDE_JOTEC\JOTEC_Portal"
git add .
git commit -m "descrição do que foi alterado"
git push
```

Em 1–3 minutos o GitHub Pages publica a versão nova automaticamente.

---

## Solução de problemas

| Problema | Solução |
|---|---|
| Página mostra 404 | Aguarde 3 min após ativar Pages; verifique se o branch é `main` e a pasta é `/` |
| Portal abre mas dá erro de JS | Abra DevTools (F12) → Console; erro de `CORS` ou `file://` não acontece no Pages |
| `git push` pede senha | Use o Personal Access Token do Passo 2b como senha |
| Prospecção não sincroniza | Verifique a URL do Apps Script em Configurações; teste o ping direto no navegador |
| Dados sumidos no celular | Os dados ficam no IndexedDB do navegador — limpar dados do site apaga tudo; use o módulo Backup |
