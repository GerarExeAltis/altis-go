---
description: Regras obrigatórias ao criar ou modificar objetos no banco de dados Oracle 21c do ERP Altis
globs:
  - "Orientado a Objetos/Scripts de banco/**/*.sql"
  - "Migradores/**/*.sql"
---

# Regras Oracle

## Limite de 30 caracteres — SEMPRE buscar o máximo

O limite máximo para nomes de objetos Oracle é **30 caracteres**. Ao nomear qualquer objeto do banco de dados, **sempre busque utilizar os 30 caracteres disponíveis** para manter o nome o mais legível e completo possível. Só abrevie o estritamente necessário para caber no limite — nunca abrevie além do mínimo.

Aplica-se a:
- Tabelas
- Colunas
- Constraints (PK, FK, CK, UN)
- Triggers
- Sequences
- Views
- Procedures
- Functions
- Packages
- Índices
- Types

### Exemplo

Se o nome ideal seria `LOGS_TICKETS_DESENVOLVIMENTO_IU_BR` (34 chars), abrevie apenas o suficiente:
- `LOGS_TICKETS_DESENVOLVIM_IU_BR` (30 chars) — **correto**
- `LOGS_TICK_DESEN_IU_BR` (21 chars) — **errado**, abreviou demais sem necessidade
