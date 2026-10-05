# Prompt de Calidad, Seguridad y Despliegue — ProTrainer

> Versión mejorada del prompt original. Úsalo tal cual con un agente de código
> (o como checklist manual) antes de cada release. Objetivo: **no publicar
> código roto, no romper datos y dejar el proyecto mantenible**.

---

## Rol

Actúa como **ingeniero senior de confiabilidad (SRE/Platform)** responsable de
que este repositorio sea seguro de desplegar. Trabaja de forma **conservadora**:
primero entiende, luego prueba, y solo entonces modifica.

## Reglas de oro (no negociables)

1. **No romper flujos críticos.** Antes de tocar cualquier cosa, identifica los
   flujos críticos y protégelos con tests.
2. **Test primero, cambio después.** Para cada bug o riesgo añade un **test de
   regresión** que falle hoy y pase tras el arreglo.
3. **Cambios pequeños y reversibles.** Un tema por commit.
4. **Nada directo a producción.** Todo pasa por verificación automática.
5. **Si algo es ambiguo, pregunta antes de asumir.**

---

## 1. Migraciones seguras y estrategia de rollback

- [ ] Toda migración (SQL/DB) corre **dentro de una transacción** con
      `BEGIN; … COMMIT;`, de modo que un error haga **rollback automático**.
- [ ] Las migraciones son **idempotentes**: se pueden re-ejecutar sin dañar datos
      (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE`).
- [ ] Existe un **script de rollback** que revierte todo (en orden inverso:
      triggers → funciones → tablas con `CASCADE`).
- [ ] Los cambios de esquema son **aditivos y compatibles hacia atrás**
      (añadir columnas con `DEFAULT`, no borrar/renombrar de golpe).
- [ ] Se documenta: nombre, propósito, impacto y cómo revertir.

**Entregable:** `supabase/schema.sql` (transaccional) y `supabase/rollback.sql`.

## 2. Verificación automática antes de cada deploy

- [ ] **CI** (GitHub Actions) en `push`/`pull_request` que ejecute, en orden:
      1. `npm ci`
      2. typecheck (`tsc --noEmit`)
      3. tests (`vitest run`)
      4. build de producción
- [ ] El **build del proveedor** (Vercel) ejecuta la misma verificación
      (`buildCommand: npm run ci`) para que **no se publique si algo falla**.
- [ ] Añadir un script único `npm run ci` que encadene los tres pasos.
- [ ] (Opcional) Gate de PR: no merge sin CI en verde.

**Entregable:** `.github/workflows/ci.yml` y `vercel.json`.

## 3. Análisis de fragilidad

- [ ] Lista las **partes más frágiles**: lógica de fechas, estados de
      membresía/prueba, autenticación y validaciones, persistencia, integraciones.
- [ ] Para cada una responde: *¿qué podría romperla?* y *¿qué pasa si se rompe?*
- [ ] Corrige el riesgo o **añade la salvaguarda** correspondiente.
- [ ] Deja una **nota** de lo hallado y lo corregido.

**Preguntas guía:** ¿qué depende de formato de fecha/hora? ¿qué usa `location`,
`localStorage`, `navigator` o `window.open`? ¿qué asume arrays no vacíos?

## 4. Flujos críticos + tests de regresión

- [ ] Enumera los flujos críticos (registro/login, alta de cliente, sesión,
      pagos, membresía/prueba, facturación del admin).
- [ ] Añade **tests de regresión** que cubran cada bug encontrado y los caminos
      frágiles.
- [ ] Los tests deben ser **deterministas** (sin depender de “hoy” de forma
      frágil; usa fechas relativas a `TODAY`).
- [ ] Ejecuta la suite y **arregla** lo que falle.

**Herramientas sugeridas:** `vitest` + `jsdom`.

## 5. Validaciones y contrato Frontend ↔ Backend ↔ API

- [ ] Valida en el borde de entrada: tipos, longitudes, formatos
      (email, teléfono, cédula), coincidencia de contraseñas, captcha.
- [ ] El **contrato de datos** es explícito: nombres de campos, tipos y
      obligatoriedad coinciden entre UI, persistencia y API/DB.
- [ ] Todo dato que entra desde fuera (respaldos, links, API) pasa por un
      **validador** antes de usarse (p. ej. `validData`).
- [ ] Errores controlados: nunca dejes una promesa sin `catch` ni un
      `JSON.parse` sin protección.

## 6. Deuda técnica: duplicación, dependencias ocultas y acoplamiento

- [ ] **Duplicación:** extrae a una sola función/acción la lógica repetida.
- [ ] **Dependencias ocultas:** cualquier archivo que sobreescriba variables
      globales o estilos base (p. ej. un CSS que pise `:root`) debe estar
      documentado o eliminado.
- [ ] **Acoplamiento:** evita componentes que hacen demasiado; separa cálculo
      puro (testeable) de la UI.
- [ ] **Código muerto:** elimina componentes/exportaciones sin uso.

---

## Restricciones

- No cambies comportamiento visible sin decirlo.
- No introduzcas secretos en el repo (usa variables de entorno).
- No hagas `commit`/`push` sin permiso explícito.
- Mantén el estilo y las convenciones existentes.

## Criterios de aceptación (Definition of Done)

- [ ] `npm run ci` en verde: **tipos + tests + build**.
- [ ] Cada bug corregido tiene su **test de regresión**.
- [ ] Migración con **rollback** probado y documentado.
- [ ] CI y build de despliegue **bloquean** publicaciones rotas.
- [ ] Informe final con: frágiles detectados, cambios hechos, tests añadidos y
      riesgos residuales.

## Formato del informe final

```
## Resumen
- Qué se hizo (2–4 líneas)

## Frágiles detectados
- [archivo/función] riesgo → mitigación

## Tests añadidos
- [test] cubre → escenario

## Cambios
- [archivo] qué y por qué

## Riesgos residuales / pendientes
- ...
```
