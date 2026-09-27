# PubPascal

> O ecossistema moderno de gerenciamento de dependências, empacotamento e colaboração para a comunidade Object Pascal (Delphi e Free Pascal).

Repositório central oficial: [https://github.com/HashLoad/pubpascal-dev](https://github.com/HashLoad/pubpascal-dev)

---

## 🏛️ Estrutura do Monorepo

O ecossistema PubPascal é organizado em quatro frentes principais:

```text
pubpascal-dev/
├── portal/       # Portal Web oficial (Next.js 15, TypeScript, Supabase, Tailwind)
├── studio/       # Clientes nativos em Delphi (Desktop + Plugin RAD Studio OTA)
│   ├── core/         # Componentes compartilhados (WebView2 bridge, CLI runner, visualizador)
│   ├── desktop/      # Aplicativo Windows desktop independente (ppdesktop.exe)
│   ├── ota/          # Pacote de design-time BPL para RAD Studio (ppota.bpl)
│   └── installer/    # Scripts de empacotamento Inno Setup (PubPascal Setup)
├── cli/          # Scripts e orquestração do motor de linha de comando (Boss)
├── docs/         # Registros de decisões de arquitetura (ADRs) e especificações
└── .github/      # Workflows automatizados de CI/CD e esteira de qualidade
```

---

## 🌐 1. Portal (`portal/`)

O portal web ([pubpascal.dev](https://www.pubpascal.dev)) provê o catálogo de pacotes, documentação, análise de conformidade CRA (Cyber Resilience Act), geração de SBOM, emissão de tokens de CLI e painel administrativo.

### Tecnologias:
- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Estilização:** Tailwind CSS + PostCSS
- **Banco de Dados & Auth:** Supabase (PostgreSQL, Row Level Security, RPCs)
- **Testes:** Vitest + React Testing Library

### Como rodar localmente:
```bash
cd portal
npm install
npm run dev
```

Testes unitários:
```bash
cd portal
npm test
```

---

## 🖥️ 2. Studio (`studio/`)

O PubPascal Studio entrega a experiência visual para desenvolvedores Pascal gerenciarem dependências, grafos de pacotes e versionamento.

- **`studio/core/`**: Biblioteca compartilhada contendo o frame visual (`PubPascal.View`), ponte com WebView2 (Microsoft Edge Chromium) e executor de comandos CLI (`PubPascal.CliRunner`).
- **`studio/desktop/`**: Aplicação Windows nativa standalone (`ppdesktop.dpr`).
- **`studio/ota/`**: Plugin Open Tools API (BPL) para o RAD Studio (`ppota.dpk`), acoplando a interface visual diretamente nas janelas da IDE.
- **`studio/installer/`**: Script Inno Setup 6 (`pubpascal.iss`) para distribuição única (instalando Desktop, Plugin OTA e CLI no PATH).

### Compilação:
- Desktop: `pwsh -File studio/desktop/scripts/build.ps1`
- OTA Plugin: `pwsh -File studio/ota/scripts/build.ps1`
- Instalador: `pwsh -File studio/installer/build.ps1`

---

## ⚙️ 3. CLI (`cli/`)

O motor de linha de comando oficial do PubPascal é baseado no **Boss**, mantido em seu próprio repositório oficial. Ele provê comandos como `install`, `update`, `workspace clone/status`, `pkg spec`, `sbom` e conformidade `cra`.

- O script `cli/scripts/build.ps1` orquestra a compilação do binário otimizado (`boss.exe`) utilizando o compilador Go.

---

## 📚 4. Documentações & ADRs (`docs/`)

- [`adr-002-dev-flow-contribuicao.md`](docs/adr-002-dev-flow-contribuicao.md): Fluxo de contribuição e desenvolvimento.
- [`retrocompatibilidade.md`](docs/retrocompatibilidade.md): Diretrizes de compatibilidade com projetos legado e ecossistema Boss.

---

## 🔒 Segurança

Consulte [SECURITY.md](SECURITY.md) para diretrizes de divulgação responsável de vulnerabilidades.
