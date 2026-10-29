# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

### Padrão de Nomenclatura e Versionamento
- **Incrementos de Versões Menores (`+0.1`)**: Introdução de novos módulos, recursos de grande impacto ou funcionalidades expansivas (ex: `0.1.0` -> `0.2.0` -> `0.3.0` -> `0.4.0` -> `0.5.0`).
- **Incrementos de Versões de Correção ou Pontuais (`+0.0.1`)**: Correções de bugs, pequenos ajustes de interface, otimizações de performance e refinamentos funcionais (ex: `0.4.1`, `0.5.1`, `0.5.2`).

---

## [0.5.2] - 2026-10-25

### Adicionado & Aprimorado
- **Sincronização em Nuvem com Google Sheets e Google Drive**:
  - Integração via Webhook seguro do **Google Apps Script** executado diretamente na conta pessoal do Google do usuário (Custo Zero, sem necessidade de configuração no Google Cloud Console).
  - Criação e atualização automática de planilha no Google Drive (**"IronTrack - Treinos & Histórico"**) com 4 abas estruturadas e formatadas:
    - *Treinos Atuais*: Semana, Dia, Foco, Exercício, Séries Totais, Repetições, Prep, Carga %, Carga, Tipo de Carga, RPE, Descanso, Status (Sim / Não / Pulado), Séries Feitas (ex: `3/3`) e Anotação/Log.
    - *Histórico de Treinos*: Data/Horário formatado, Exercício, Repetições, Carga, Unidade, Séries Concluídas, Séries Totais, RPE e Comentários de todas as sessões anteriores realizadas.
    - *1RM & Percentuais*: Matriz calculada dinamicamente com percentuais de 100% a 50% para Agachamento (Squat), Supino (Bench Press) e Levantamento Terra (Deadlift).
    - *Resumo & Metadados*: Estatísticas consolidadas do ciclo, exercícios concluídos, pendentes e pulados, total de registros históricos e data da última sincronização.
  - Salvamento e atualização automática do arquivo de backup JSON completo `irontrack_sync_backup.json` no Google Drive.
  - Sincronização manual sob demanda com 1 toque no app e indicador de status e resumo da última sincronização em tempo real.
  - Restauração instantânea entre dispositivos (cross-device restore) disponível tanto nas Configurações quanto diretamente na tela inicial de importação.
  - Modal ilustrado passo a passo com guia de configuração e botão para copiar ou compartilhar o código pronto do script.
- **Histórico Multi-Sessões no Modo NoTreino (OnTrain)**:
  - Exibição das últimas 3 sessões realizadas do exercício ativo através de `getLastExerciseSnapshots`, com data, repetições, carga, unidade, séries feitas e RPE.
- **Otimização de Build e Limpeza**:
  - Remoção de versões legadas de APKs na raiz mantendo apenas o executável da versão atual (`irontrack-v0.5.2.apk`).
  - Otimização do escopo do Tailwind CSS eliminando varreduras acidentais no diretório `node_modules` durante o build de produção.

---

## [0.5.1] - 2026-06-16

### Corrigido & Aprimorado
- **Correção e Robustez na Importação / Exportação**:
  - Correção na decodificação de arquivos TSV/CSV com acentos em Português via Base64 e UTF-8 BOM.
  - Suporte a arquivos com colunas de anotações e séries feitas divididas pelo Google Sheets ou Excel.
- **Estabilização da Camada de Armazenamento**:
  - Consolidação do banco SQLite nativo (`@capacitor-community/sqlite` na tabela `kv_store`) com rotina de migração transparente do Capacitor Preferences.
- **Correspondência de Histórico por Repetições**:
  - Recuperação refinada da última sessão priorizando séries com o mesmo número de repetições prescritas.

---

## [0.5.0] - 2026-05-11

### Adicionado & Aprimorado
- **Status Concluído e Não Feito / Pulado (`done` / `undone`)**:
  - Novo botão interativo "Marcar como não feito" (`mark_not_done`) para pular exercícios de forma explícita sem registrar séries incorretamente.
  - Auto-conclusão do exercício (`done`) assim que todas as séries prescritas são marcadas manualmente.
  - Indicador visual âmbar com ícone XCircle e badge "Pulado" para exercícios não realizados.
- **Redesenho do Card de Sessões Anteriores**:
  - Layout compacto em duas linhas: primeira linha com métricas essenciais (séries, repetições, peso, RPE e data) e segunda linha com a anotação/comentário registrada na sessão anterior.
- **Suporte a Novas Colunas no Parser CSV**:
  - Tratamento avançado de colunas adicionais de anotações e contadores de séries feitas (`series_feitas`).

---

## [0.4.1] - 2026-04-26

### Adicionado & Aprimorado
- **Memória de Última Sessão Realizada (Exercise Snapshot History)**:
  - Registro automático de snapshot no SQLite ao concluir um exercício no treino.
  - Normalização inteligente do nome dos exercícios (insensível a acentos e maiúsculas/minúsculas).
  - Consulta rápida e exibição dos valores anteriores na interface durante a execução.

---

## [0.4.0] - 2026-03-28

### Adicionado
- **Seção de Calculadora de 1RM (One Rep Max)**:
  - Calculadora rápida com cálculo automático de percentuais (100% até 50% de 5 em 5%) para os três movimentos fundamentais do powerlifting: Agachamento, Supino e Levantamento Terra.
  - Persistência dos valores e integração completa com a importação e exportação de dados.
- **Seleção de Unidades de Carga por Exercício**:
  - Suporte a seleção individual de unidade: quilogramas (`kg`), barras (`bar.`) e halteres (`halt.`).
  - Normalização automática das unidades na interface e no arquivo exportado.

---

## [0.3.0] - 2026-03-28

### Adicionado
- **Modo NoTreino (OnTrain Focus Mode)**:
  - Modo de visualização focado exercício a exercício em carrossel horizontal de tela cheia.
  - Transição automática com avanço para o próximo exercício ao concluir todas as séries do exercício atual.
  - Cartão de prévia no topo exibindo o próximo exercício do dia e sua respectiva carga.
  - Contador dinâmico de exercícios restantes no dia ("X restantes").
  - Alternador de modo (Clássico vs NoTreino) no cabeçalho do aplicativo.

---

## [0.2.0] - 2026-02-26

### Adicionado & Aprimorado
- **Registro e Edição de RPE (Rate of Perceived Exertion)**:
  - Seletor de escala de percepção de esforço de 1 a 10 ou `-`.
- **Edição de Carga com Formatação Numérica**:
  - Teclado numérico com suporte a vírgula decimal para ajuste rápido de cargas por exercício.
- **Exportação em Formato TSV com UTF-8 BOM**:
  - Exportação em formato separado por tabulações (TSV) com caractere BOM para evitar conflitos de vírgula em softwares de planilhas.
- **Cronômetro de Descanso e Notificações**:
  - Cronômetro regressivo com disparador de notificações nativas no Android ao término do descanso.

---

## [0.1.0] - 2026-02-08

### Adicionado
- **Lançamento Inicial do IronTrack**:
  - Aplicativo móvel para acompanhamento de planos e ciclos de treino de powerlifting e musculação.
  - Importação de treinos via arquivo CSV/TSV e colagem de texto bruto.
  - Rastreamento de séries com indicadores interativos.
  - Campo de anotações e observações por exercício.
  - Tema escuro nativo (Dark Theme) com Tailwind CSS.
  - Suporte bilíngue completo a Português (`pt-BR`) e Inglês (`en`).
  - Empacotamento Android via Capacitor 6 com compilação autônoma offline.

[0.5.2]: https://github.com/mikael04/irontrack/releases/tag/v0.5.2
[0.5.1]: https://github.com/mikael04/irontrack/releases/tag/v0.5.1
[0.5.0]: https://github.com/mikael04/irontrack/releases/tag/v0.5.0
[0.4.1]: https://github.com/mikael04/irontrack/releases/tag/v0.4.1
[0.4.0]: https://github.com/mikael04/irontrack/releases/tag/v0.4.0
[0.3.0]: https://github.com/mikael04/irontrack/releases/tag/v0.3.0
[0.2.0]: https://github.com/mikael04/irontrack/releases/tag/v0.2.0
[0.1.0]: https://github.com/mikael04/irontrack/releases/tag/v0.1.0
