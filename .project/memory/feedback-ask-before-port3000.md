---
name: feedback-ask-before-port3000
description: Pedir antes de ocupar a porta 3000 (preview / next dev do portal) e liberar
  quando terminar — o operador controla a 3000
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8772b5dd-efcb-4be6-8447-e646ecbede3a
type: feedback
---
# Pedir antes de ocupar a porta 3000; liberar ao terminar

**Regra:** não subir o preview / `next dev` na porta 3000 por reflexo. **Pedir ao operador antes.** E **liberar** (`preview_stop` no server do preview) quando terminar a rodada de verificação.

**Why:** 2026-06-10 o operador pediu explicitamente "tem como liberar a porta 3000 por enquanto? quando precisar me pede novamente". A 3000 é disputada na máquina dele (dev server do portal + outros usos), então pegar sem avisar atrapalha.

**How to apply:**
- Antes de `preview_start` / subir o portal na 3000: avisar e pedir, não fazer calado.
- Ao terminar de verificar algo no preview: `preview_stop` pra devolver a 3000.
- ⚠️ O app PubDelphi (CLI `list`/`status`/`clone`) bate em `localhost:3000` — então testar o app **de verdade** exige o portal rodando na 3000. Logo: pra esse e2e, pedir a 3000 de volta primeiro.
- Como liberar/checar: `Get-NetTCPConnection -LocalPort 3000 -State Listen` mostra o PID; `mcp__Claude_Preview__preview_list` mostra se é um server gerenciado (parar com `preview_stop`).
- Relacionado: [[feedback-fluxent-port3000-standing-auth]] — aquele é sobre o **container Fluxent** (outro projeto); este é sobre o **dev server do portal**. Não confundir.
