# faltaCalculada — Guide Task

> Controle de faltas por matéria: quantas já foram, quantas ainda pode ter, e o calendário letivo ajustável.

---

## 1. Visão geral

**Problema:** saber, a qualquer momento, quantas faltas restam em cada matéria sem fazer conta na mão.

**Usuária:** uma pessoa (a namorada), usando principalmente pelo **celular**.

**Regra base (padrão ensino superior BR):** frequência mínima de **75%** → pode faltar até **25%** da carga horária. Esse percentual deve ser **configurável** (algumas instituições/cursos variam).

**Princípios**
- Mobile first, abrir e registrar uma falta em no máximo 2 toques.
- Números sempre claros: "Você ainda pode faltar **X** aulas".
- Alertas visuais de risco (verde → amarelo → vermelho).

---

## 2. Regras de cálculo

Definições:
- **Unidade da falta:** 1 **horário** (1 hora da carga horária) = 1 falta.
- **Limite de faltas** = `floor(carga_horária_h × 0,25)` (equivale a `floor(carga × (1 − frequência_mínima))`)
- **Faltas restantes** = `limite − faltas_registradas`
- **Aulas já ocorridas** = aulas previstas no calendário até hoje (sem feriados/cancelamentos).
- **Aulas restantes** = aulas previstas de hoje até o fim do semestre.
- **Frequência atual** = `(aulas_ocorridas − faltas) ÷ aulas_ocorridas`
- **Frequência projetada (pior caso)** = considerando que ela falte todas as aulas restantes.

Decisões fechadas:
- [x] Falta por **horário** (não por dia). Atalho "faltei o dia/turno todo" registra todos os horários do dia de uma vez.
- [x] Arredondamento do limite: **para baixo** (`floor`), confirmado pela tabela da faculdade.
- [x] Limite calculado sobre a **carga horária oficial** (fixa), não sobre as aulas realmente dadas.

Ainda em aberto:
- [ ] Abono / falta justificada (atestado) conta ou não? → sugestão: campo "justificada" que pode ou não abater, configurável.

### 2.1 Regra da faculdade (tabela oficial)

| Carga horária | Máx. de faltas |
|---|---|
| 30h | 7 |
| 45h | 11 |
| 60h | 15 |
| 75h | 18 |
| 90h | 22 |
| 120h | 30 |

Todos os valores batem com `floor(carga × 0,25)`. O app usa a fórmula, então qualquer outra carga horária funciona sem alterar a tabela.

### 2.2 Dados reais dela (seed / casos de teste)

Situação em 14/10/2026:

| Matéria | Carga | Limite | Faltas | Restam | Horários na semana |
|---|---|---|---|---|---|
| Cirurgia | 90h | 22 | 8 | 14 | Ter: 4 · Qui: 2 |
| Endo | 90h | 22 | 3 | 19 | Seg: 1 · Qua: 4 · Sex: 1 |
| Perio | 60h | 15 | 2 | 13 | Sex manhã: 2 · Sex tarde: 2 |
| Orto | 90h | 22 | 4 | 18 | Ter manhã: 4 · Ter noite: 2 |
| Osc | 60h | 15 | 8 | 7 | Qui: 4 |

- A grade fecha com **15 semanas** de semestre em todas as matérias (6×15 = 90, 4×15 = 60).
- **Osc** é a matéria em risco: 8 de 15 faltas usadas, 1 dia de aula por semana.
- O app deve permitir cadastrar faltas **já existentes** como saldo inicial (ela já tem faltas antes de começar a usar o app).
- Datas de início e fim do semestre: **a definir** (necessárias para a projeção de aulas restantes).

---

## 3. Funcionalidades

### 3.1 Semestre
- [ ] Criar semestre (nome, data de início, data de fim)
- [ ] Frequência mínima configurável (padrão 75%)
- [ ] Arquivar semestre antigo

### 3.2 Matérias
- [ ] CRUD de matérias (nome, professor opcional, cor, carga horária **ou** nº de aulas)
- [ ] Card da matéria com: faltas feitas, faltas restantes, % de frequência, barra de risco

### 3.3 Horário semanal
- [ ] Grade: dia da semana + horário início/fim + matéria
- [ ] Uma matéria pode ter vários horários na semana
- [ ] Visualização em grade semanal

### 3.4 Calendário
- [ ] Visão mensal com dias letivos, feriados e eventos
- [ ] **Feriados nacionais pré-carregados** (fonte: BrasilAPI `/feriados/v1/{ano}` ou lista estática)
- [ ] Cadastro manual de feriados/recessos (municipal, estadual, ponte, recesso institucional)
- [ ] Tipos de alteração que ela pode registrar:
  - Feriado / recesso (sem aula)
  - Aula cancelada (de uma matéria ou do dia todo)
  - Sábado letivo / dia com horário trocado
  - Reposição de aula (aula extra)
  - Greve / paralisação (período)
- [ ] Cada alteração **recalcula** automaticamente aulas previstas e limite

### 3.5 Registro de faltas
- [ ] Botão rápido na home: "Hoje" → lista as aulas do dia → marcar presente/falta
- [ ] Registrar falta em data passada
- [ ] Marcar falta como justificada (opcional)
- [ ] Desfazer / editar / excluir falta
- [ ] Histórico por matéria

### 3.6 Dashboard (home)
- [ ] Resumo geral do semestre
- [ ] Lista de matérias ordenada por risco
- [ ] Aulas de hoje com ação de 1 toque
- [ ] Alerta quando restar ≤ 2 faltas (configurável)

### 3.7 Simulador "e se eu faltar?"
- [ ] Escolher matéria + data → mostra quantas faltas sobram depois
- [ ] Mostra frequência projetada

### 3.8 Extras (v2)
- [ ] Notificação push no dia de aula ("registrar presença?")
- [ ] Exportar resumo em PDF
- [ ] Importar feriados do calendário acadêmico (arquivo .ics)
- [ ] Múltiplos semestres / histórico
- [ ] Modo claro/escuro

---

## 4. Modelo de dados (sugestão)

```
Semester
  id, name, startDate, endDate, minAttendance (0.75), userId

Subject
  id, semesterId, name, color, workloadHours, initialAbsences (saldo inicial)

ScheduleSlot
  id, subjectId, weekday (0-6), startTime, endTime

CalendarEvent
  id, semesterId, type (HOLIDAY | CANCELLED | EXTRA_CLASS | REPLACEMENT | STRIKE | SCHEDULE_CHANGE),
  date, endDate?, subjectId? (null = todas), note

Absence
  id, subjectId, date, classesCount (padrão 1), justified (bool), note
```

**Geração de aulas previstas:** para cada dia do semestre, aplicar `ScheduleSlot` do weekday e depois os `CalendarEvent` (remove/adiciona aulas). Pode ser calculado sob demanda em vez de persistido.

---

## 5. Stack sugerida

| Camada | Opção | Obs. |
|---|---|---|
| Front | **Next.js + TypeScript + Tailwind** | PWA instalável no celular |
| Back/DB | **Supabase** (Postgres + Auth) *ou* Node/Express + Prisma + Postgres | Supabase acelera, Express dá mais controle |
| Deploy | Coolify + Docker (Traefik) | mesmo fluxo dos outros projetos |
| Alternativa mobile | React Native + Expo | só se quiser app nativo na loja |

**Recomendação:** começar com **PWA** (um código só, instala na tela inicial, funciona offline com cache). Decidir se vira Expo depois.

Decisões em aberto:
- [ ] Login (Supabase Auth/e-mail) ou uso local sem conta (localStorage/IndexedDB)?
- [ ] Offline-first necessário?
- [ ] Vai ter multiusuário (outras pessoas usarem) ou só ela?

---

## 6. Identidade visual (a decidir)

**Nome:** faltaCalculada
**Direção inicial:** preto + rosa

Proposta de partida (ajustar juntos):

| Token | Valor sugerido |
|---|---|
| Fundo | `#0A0A0B` |
| Superfície/card | `#161618` |
| Rosa principal | `#FF4D8D` |
| Rosa suave | `#FF8FB8` |
| Texto | `#F5F5F7` |
| Texto secundário | `#9A9AA2` |
| Sucesso | `#3DDC97` |
| Alerta | `#FFC857` |
| Perigo | `#FF5A5F` |

- [ ] Definir tipografia (ex.: Inter / Poppins / uma display para o logo)
- [ ] Logo: wordmark `faltaCalculada` (camelCase, "Calculada" em rosa?)
- [ ] Ícone do app (calculadora + calendário? coração?)
- [ ] Tom de voz (leve, divertido, tipo "ainda dá pra matar 3 aulas 😌")
- [ ] Atenção: cores de risco (verde/amarelo/vermelho) precisam conviver com o rosa sem confundir com o perigo

---

## 7. Roadmap de tarefas

### Fase 0 — Definição
- [ ] Fechar regras de cálculo (seção 2)
- [ ] Decidir stack e login (seção 5)
- [ ] Fechar identidade visual (seção 6)
- [ ] Rascunhar telas (home, matérias, calendário, registro de falta)

### Fase 1 — Setup
- [ ] Criar repositório e projeto Next.js + TS + Tailwind
- [ ] Configurar tema (tokens preto/rosa)
- [ ] Configurar banco e modelos (seção 4)
- [ ] Configurar PWA (manifest, ícones, service worker)

### Fase 2 — Núcleo
- [ ] CRUD de semestre
- [ ] CRUD de matérias + cálculo do limite de faltas
- [ ] Grade de horários
- [ ] Registro de faltas
- [ ] Dashboard com faltas restantes por matéria

### Fase 3 — Calendário
- [ ] Geração de aulas previstas a partir da grade
- [ ] Feriados nacionais pré-carregados
- [ ] Alterações no calendário (cancelada, reposição, sábado letivo…)
- [ ] Recalculo automático ao alterar o calendário

### Fase 4 — Polimento
- [ ] Simulador "e se eu faltar?"
- [ ] Alertas de risco
- [ ] Estados vazios, loading e erros
- [ ] Testes das regras de cálculo (**prioridade alta**: é o coração do app)
- [ ] Deploy (Coolify) e teste no celular dela

### Fase 5 — v2
- [ ] Notificações push
- [ ] Exportar PDF
- [ ] Importar .ics
- [ ] Histórico de semestres

---

## 8. Critérios de aceite do MVP

- [ ] Ela cadastra um semestre com 5+ matérias e a grade semanal em menos de 10 min
- [ ] Registra uma falta em até 2 toques a partir da home
- [ ] O número de faltas restantes bate com a conta manual em todos os casos de teste
- [ ] Adicionar um feriado/cancelamento atualiza os números na hora
- [ ] Funciona bem no celular (PWA instalado)

---

## 9. Casos de teste do cálculo

| Cenário | Entrada | Esperado |
|---|---|---|
| Cargas da tabela | 30h / 45h / 60h / 75h / 90h / 120h | limite = 7 / 11 / 15 / 18 / 22 / 30 |
| Osc 60h com 8 faltas | — | restantes = 7 |
| Cirurgia 90h com 8 faltas | — | restantes = 14 |
| Endo 90h com 3 faltas | — | restantes = 19 |
| Falta de turno inteiro (Orto, ter manhã) | 4 horários | +4 faltas de uma vez |
| Feriado cai em dia de aula | remove 1 aula prevista | total previsto −1 (confirmar se altera o limite ou só a projeção) |
| Reposição adicionada | +1 aula | total previsto +1 |
| Falta justificada | marcada como justificada | conforme regra configurada |

> ✅ **Resolvido:** o limite é calculado sobre a carga horária oficial, conforme a tabela da faculdade (seção 2.1).
---

## 10. Perguntas pendentes

1. Datas de início e fim do semestre.
2. Faltas justificadas (atestado) abatem ou não?
3. Login ou uso local basta?
4. PWA ou app nativo (Expo)?
5. Fechar paleta, logo e tom de voz.
