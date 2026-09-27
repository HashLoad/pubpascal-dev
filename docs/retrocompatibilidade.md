# Diretriz de Arquitetura: Sincronia e Retrocompatibilidade de Metadados

Este documento detalha o modelo arquitetural de coexistência e sincronização entre os arquivos de manifesto **`boss.json`** e **`pubpascal.json`**. O objetivo primordial deste design é garantir 100% de compatibilidade retroativa com o ecossistema original do Boss, ao mesmo tempo em que introduz novos recursos avançados exigidos pelo Portal PubPascal e pela regulamentação europeia de segurança (CRA).

---

## 1. Visão Geral das Responsabilidades

A arquitetura adota o princípio de separação de responsabilidades para manter os dois manifestos focados e eficientes:

*   **`boss.json` (Motor de Compilação e Dependências)**:
    *   Focado na máquina do desenvolvedor (CLI local).
    *   Gerencia o grafo de dependências físicas locais e suas origens Git.
    *   Injeta os caminhos de busca (`mainsrc`) diretamente nos projetos Delphi (`.dproj`/`.dpk`) e Lazarus (`.lpi`/`.lpk`).
*   **`pubpascal.json` (Governança e Metadados do Portal)**:
    *   Focado no Portal Web e no Plugin IDE (OTA).
    *   Gerencia a classificação do pacote, controle de licenças e governança de segurança (SBOM).
    *   Habilita a automação de compilação/instalação de componentes visuais na IDE e a distribuição segura de instaladores comerciais.

---

## 2. Matriz de Equivalência e Mapeamento

O portal PubPascal realiza a normalização e o mapeamento automático entre os dois formatos. Caso um repositório possua apenas o `boss.json`, o portal extrai os metadados dinamicamente.

| Propriedade no `boss.json` (Original) | Propriedade no `pubpascal.json` (Portal) | Tipo de Sincronização / Regra de Negócio |
| :--- | :--- | :--- |
| `"name"` | `"name"` | Mapeamento direto 1-para-1. |
| `"version"` | `"version"` | Mapeamento direto. O portal valida sob a especificação rígida do SemVer. |
| `"homepage"` | `"homepage"` | Mapeamento direto 1-para-1. |
| `"mainsrc": "src;lib"` | `"sources": ["src", "lib"]` | O portal converte a string delimitada por ponto-e-vírgula do Boss em um array JSON estruturado. |
| `"dependencies"` <br>*(Ex: `"github.com/owner/repo"`)* | `"dependencies"` <br>*(Ex: `"owner/repo"`)* | **Normalização de URL**. O portal de-duplica as chaves removendo o host Git e mapeando os pacotes internamente. |
| `"engines": { "platforms": [...] }` | `"platforms"` | Mapeamento 1-para-1 utilizando os enums de plataforma do compilador Pascal. |

---

## 3. Mecânica de Normalização de Dependências

Para evitar colisões e manter o grafo de dependências limpo no portal, a API de publicação traduz chaves de repositórios do Boss para chaves unificadas do portal:

```
[boss.json]                                     [pubpascal.json]
"github.com/hashload/horse"   ======>  Normalização  ======>   "hashload/horse"
"gitlab.com/hashload/horse"                                 (Chave Canônica Única)
```

> [!NOTE]
> Essa normalização permite que o desenvolvedor continue utilizando o formato de URL do Git completo exigido pelo Boss CLI local, enquanto o portal mantém a indexação e busca de pacotes indexados pelo formato padrão de proprietário/repositório.

---

## 4. Classificação de Instalação (`kind`)

O manifesto `pubpascal.json` estende os metadados do pacote através da propriedade canônica **`kind`**, ditando como o ecossistema PubPascal deve processar o pacote:

### A. Pacotes de Tempo de Execução (`runtime`)
*   Bibliotecas comuns de código fonte.
*   **Comportamento**: O CLI do Boss clona o repositório e injeta os caminhos de busca diretamente nos arquivos de projeto do desenvolvedor.

### B. Pacotes de Tempo de Design (`designtime`)
*   Componentes visuais e de IDE que necessitam de registro na paleta da IDE.
*   **Comportamento**: O CLI do Boss gerencia os fontes locais. O **Plugin IDE (OTA)** compila o pacote de design-time (`.dpk`/`.lpk`) e o registra dinamicamente no registro da IDE de forma segura.

### C. Instaladores Proprietários (`installer`)
*   Componentes comerciais ou complexos distribuídos via setups executáveis.
*   **Comportamento**: O Plugin IDE realiza o download seguro do instalador a partir do portal (com checagem de hash SHA-256 e assinatura digital Authenticode) e o executa silenciosamente (`/VERYSILENT`).

---

## 5. Conclusão e Governança

> [!IMPORTANT]
> A coexistência destes dois manifestos garante estabilidade absoluta. O Boss CLI permanece focado no gerenciamento de pacotes leves por linha de comando e injeção de caminhos, sem poluir seu núcleo com registros complexos de IDE, enquanto o portal PubPascal introduz a governança empresarial necessária para auditoria de segurança (SBOM) e conformidade com a regulamentação europeia de software (CRA).
