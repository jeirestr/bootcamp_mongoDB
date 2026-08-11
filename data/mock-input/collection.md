# liquidData collection

Fill in every section below, then run **Option A** from `prompts/phase-1-foundation.md`. Replace the bracketed placeholders. Keep it short and concrete; this is the spec the generator is built from. A filled-in example (the shipped bank scenario) follows at the bottom for reference.

---

## Collection

- **Name:** `liquidData`  (must match `EVENTS_COLLECTION` in `.env`)
- **One document is:** el resultado de la extracción documental (OCR) de un documento bancario enviado por un cliente, asociado a un proceso bancario específico.
- **Approximate volume for the demo:** ~300 records (100 per subtype)

## Sample Doc

Ver sección **Sample records** al final.

## Fields

Campos comunes a todos los documentos:

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | stable id |
| `bdtlRecordDate` | Date | fecha de ingreso del registro al sistema |
| `bdtlCleanupDate` | Date | fecha programada de limpieza del registro |
| `process.name` | String | nombre del proceso bancario (enum) |
| `process.code` | String \| null | código del proceso, puede ser null |
| `process.referenceId` | String | identificador del archivo fuente, e.g. `T001_AFD001.pdf` |
| `process.entity.value` | String | entidad que origina el proceso |
| `processing._id` | String | hash SHA1 del procesamiento |
| `processing.startDate` | Date | inicio del procesamiento |
| `processing.endDate` | Date | fin del procesamiento |
| `processing.technology.value` | String | tecnología usada (enum) |
| `processing.channel.value` | String | canal de ingesta del documento (enum) |
| `document.subtype` | String | tipo de documento procesado (enum); determina la estructura de `liquidData` |
| `document.liquidData` | Object | campos extraídos por OCR; estructura varía según `document.subtype` (ver abajo) |
| `document.liquidDataDetail` | null | reservado, siempre null en v1 |
| `document.issueDate` | Date | fecha de emisión del documento original |
| `document.validityDays` | Number \| null | vigencia del documento en días, null si no aplica |
| `status.value` | String | estado del registro (enum) |
| `status.lastChangeDate` | Date | fecha del último cambio de estado |
| `ingestionVersion` | String | versión del pipeline de ingesta, e.g. `v1.0.0 - LegacySQL` |

### `document.liquidData` — estructura por `document.subtype`

Todos los campos OCR siguen el patrón: `{ confidence: string, value: string, status: string }`.

#### Subtype: `Carta laboral`

| Field | Type | Notes |
|---|---|---|
| `transaction_id` | String | hash del procesamiento |
| `DocID` | String | identificador interno del documento |
| `result_json.ingresos` | Array | lista de ingresos; cada elemento tiene `descripcion` y `cantidad` (OCR fields) |
| `result_json.tipo_id_empleador` | OCR field | tipo de identificación del empleador |
| `result_json.contrato` | OCR field | tipo de contrato laboral |
| `result_json.fecha_expedicion` | OCR field | fecha de expedición de la carta (YYYY-MM-DD) |
| `result_json.fecha_contratos` | Array | lista de fechas de contratos anteriores |
| `result_json.digito_verificacion` | OCR field | dígito de verificación del empleador |
| `result_json.nombre_empleado` | OCR field | nombre completo del empleado |
| `result_json.nombre_empleador` | OCR field | razón social del empleador |
| `result_json.fecha_vinculacion` | OCR field | fecha de vinculación laboral (YYYY-MM-DD) |
| `result_json.id_empleador` | OCR field | número de identificación del empleador |
| `result_json.id` | OCR field | número de identificación del empleado |
| `result_json.tipo_id` | OCR field | tipo de identificación del empleado |
| `result_json.cargo` | OCR field | cargo del empleado |
| `result_json.files_to_process` | Array | duplicado estructural de los campos anteriores por archivo procesado (by design) |

#### Subtype: `Cedula de Ciudadania`

| Field | Type | Notes |
|---|---|---|
| `nombres` | OCR field | primer y segundo nombre |
| `apellidos` | OCR field | primer y segundo apellido |
| `numero_documento` | OCR field | número de cédula |
| `fecha_nacimiento` | OCR field | fecha de nacimiento (YYYY-MM-DD) |
| `lugar_expedicion` | OCR field | municipio de expedición de la cédula |

#### Subtype: `RUT`

| Field | Type | Notes |
|---|---|---|
| `primer_apellido` | OCR field | primer apellido |
| `segundo_apellido` | OCR field | segundo apellido |
| `primer_nombre` | OCR field | primer nombre |
| `otros_nombres` | OCR field | segundo nombre u otros nombres |
| `numero_identificacion` | OCR field | NIT o número de identificación tributaria |
| `dv` | OCR field | dígito de verificación del NIT |

## Enums

- `process.name`: `Requerimientos Banco`, `Vinculación Banco`, `Solicitud de Prestamo`
- `document.subtype`: `Carta laboral`, `Cedula de Ciudadania`, `RUT`
- `processing.technology.value`: `MONGO`
- `processing.channel.value`: `CARPETA COMPARTIDA`, `CORREO`, `MULTIFUNCIONAL`
- `status.value`: `NUEVO`, `ACTUALIZADO`
- OCR `status` (dentro de `liquidData`): `processed_successfully`

> Cualquier combinación de `process.name` × `document.subtype` es válida. Los 3 subtypes pueden pertenecer a cualquiera de los 3 procesos.

## Units and conventions

- Timestamps are UTC BSON dates.
- `confidence` values are strings representing floats between 0.0 and 1.0 (e.g., `"0.99"`).
- Monetary amounts in `result_json.ingresos[*].cantidad.value` are strings representing integers en pesos colombianos sin decimales (e.g., `"2225550"` = $2.225.550 COP).
- Dates inside OCR fields (e.g., `fecha_expedicion.value`, `fecha_nacimiento.value`) are strings in `YYYY-MM-DD` format.
- `processing._id` is a SHA1 hash string, not a MongoDB ObjectId.

## Consistency rules

- `document.subtype` determines the structure of `document.liquidData`: `Carta laboral` siempre tiene `liquidData.result_json`; `Cedula de Ciudadania` y `RUT` tienen campos OCR planos.
- `processing.startDate` <= `processing.endDate`.
- Un registro con `status.value = "ACTUALIZADO"` debe tener `bdtlRecordDate` posterior al registro `"NUEVO"` con el mismo `process.referenceId`.
- `result_json.files_to_process` contiene los mismos campos que `result_json` (duplicación estructural intencional del pipeline).

## Verifiable facts (the anchors)

Preguntas concretas que el demo debe poder responder, con la respuesta que los datos deben hacer verdadera:

- "¿Cuántos clientes tienen salario básico mayor a 2.000.000?" → exactamente N registros `Carta laboral` con `result_json.ingresos[*].descripcion.value = "SALARIO BASICO"` y `cantidad.value > "2000000"`.
- "¿Cuántos empleados trabajan para SURA SA?" → un conteo específico con `result_json.nombre_empleador.value = "SURA SA"`.
- "¿Qué clientes tienen cargo de ASESORA VENTAS?" → una lista específica por `result_json.cargo.value = "ASESORA VENTAS"`.
- "¿Cuántas cédulas fueron expedidas en MANIZALES?" → un conteo específico con `liquidData.lugar_expedicion.value = "MANIZALES"`.
- "¿Cuántas personas nacieron después de 1990?" → calculable desde `liquidData.fecha_nacimiento.value > "1990-12-31"`.
- (Caso borde) Un mismo `process.referenceId` tiene un registro `"NUEVO"` y uno `"ACTUALIZADO"`, para que el agente distinga versiones del mismo documento.

## Sample records (hand-author 3 to 5)

```json
[
  {
    "bdtlRecordDate": { "$date": "2026-08-10T14:10:56.743Z" },
    "bdtlCleanupDate": { "$date": "2026-09-12T14:10:56.743Z" },
    "process": {
      "name": "Requerimientos Banco",
      "code": null,
      "referenceId": "T001_AFD001.pdf",
      "entity": { "value": "Bootcamp" }
    },
    "processing": {
      "_id": "56e55b3a0ed62d36619cdb3b72961a81bd896a3a",
      "startDate": { "$date": "2026-03-12T14:10:00.000Z" },
      "endDate": { "$date": "2026-03-12T14:10:00.000Z" },
      "technology": { "value": "MONGO" },
      "channel": { "value": "CARPETA COMPARTIDA" }
    },
    "document": {
      "subtype": "Carta laboral",
      "liquidData": {
        "transaction_id": "56e55b3a0ed62d36619cdb3b72961a81bd896a3a",
        "DocID": "43570",
        "result_json": {
          "ingresos": [
            { "descripcion": { "confidence": "0.99", "value": "SALARIO BASICO", "status": "processed_successfully" }, "cantidad": { "confidence": "0.99", "value": "2225550", "status": "processed_successfully" } },
            { "descripcion": { "confidence": "0.90", "value": "OTRO", "status": "processed_successfully" }, "cantidad": { "confidence": "0.99", "value": "89906", "status": "processed_successfully" } }
          ],
          "tipo_id_empleador": { "confidence": "0.99", "value": "NIT", "status": "processed_successfully" },
          "contrato": { "confidence": "0.99", "value": "INDEFINIDO", "status": "processed_successfully" },
          "fecha_expedicion": { "confidence": "0.99", "value": "2023-05-03", "status": "processed_successfully" },
          "fecha_contratos": [],
          "digito_verificacion": { "confidence": "0.90", "value": "", "status": "processed_successfully" },
          "nombre_empleado": { "confidence": "0.99", "value": "PEDRO GRAJALES", "status": "processed_successfully" },
          "nombre_empleador": { "confidence": "0.99", "value": "SURA SA", "status": "processed_successfully" },
          "fecha_vinculacion": { "confidence": "0.99", "value": "2020-01-10", "status": "processed_successfully" },
          "id_empleador": { "confidence": "0.99", "value": "800306", "status": "processed_successfully" },
          "id": { "confidence": "0.99", "value": "12370", "status": "processed_successfully" },
          "tipo_id": { "confidence": "0.99", "value": "CEDULA DE CIUDADANIA", "status": "processed_successfully" },
          "cargo": { "confidence": "0.99", "value": "ASESORA VENTAS", "status": "processed_successfully" },
          "files_to_process": []
        }
      },
      "liquidDataDetail": null,
      "issueDate": { "$date": "2023-05-03T05:00:00.000Z" },
      "validityDays": null
    },
    "status": { "value": "NUEVO", "lastChangeDate": { "$date": "2026-03-12T14:10:56.743Z" } },
    "ingestionVersion": "v1.0.0 - LegacySQL"
  },
  {
    "bdtlRecordDate": { "$date": "2026-08-10T14:10:56.743Z" },
    "bdtlCleanupDate": { "$date": "2026-09-12T14:10:56.743Z" },
    "process": {
      "name": "Vinculación Banco",
      "code": null,
      "referenceId": "T004_AFD004.pdf",
      "entity": { "value": "Bootcamp" }
    },
    "processing": {
      "_id": "56e55b3a0ed62d36619cdb3b72961a81bd896a3a",
      "startDate": { "$date": "2026-03-12T14:10:00.000Z" },
      "endDate": { "$date": "2026-03-12T14:10:00.000Z" },
      "technology": { "value": "MONGO" },
      "channel": { "value": "CARPETA COMPARTIDA" }
    },
    "document": {
      "subtype": "Cedula de Ciudadania",
      "liquidData": {
        "nombres": { "confidence": "0.99", "value": "ANGELA MARIA", "status": "processed_successfully" },
        "apellidos": { "confidence": "0.99", "value": "GIRALDO VARGAS", "status": "processed_successfully" },
        "numero_documento": { "confidence": "0.99", "value": "43567890", "status": "processed_successfully" },
        "fecha_nacimiento": { "confidence": "0.99", "value": "1990-09-25", "status": "processed_successfully" },
        "lugar_expedicion": { "confidence": "0.98", "value": "MANIZALES", "status": "processed_successfully" }
      },
      "liquidDataDetail": null,
      "issueDate": { "$date": "2023-05-03T05:00:00.000Z" },
      "validityDays": null
    },
    "status": { "value": "NUEVO", "lastChangeDate": { "$date": "2026-03-12T14:10:56.743Z" } },
    "ingestionVersion": "v1.0.0 - LegacySQL"
  },
  {
    "bdtlRecordDate": { "$date": "2026-08-10T14:10:56.743Z" },
    "bdtlCleanupDate": { "$date": "2026-09-12T14:10:56.743Z" },
    "process": {
      "name": "Solicitud de Prestamo",
      "code": null,
      "referenceId": "T005_AFD005.pdf",
      "entity": { "value": "Bootcamp" }
    },
    "processing": {
      "_id": "56e55b3a0ed62d36619cdb3b72961a81bd896a3a",
      "startDate": { "$date": "2026-03-12T14:10:00.000Z" },
      "endDate": { "$date": "2026-03-12T14:10:00.000Z" },
      "technology": { "value": "MONGO" },
      "channel": { "value": "CARPETA COMPARTIDA" }
    },
    "document": {
      "subtype": "RUT",
      "liquidData": {
        "primer_apellido": { "confidence": "0.99", "value": "PEREZ", "status": "processed_successfully" },
        "segundo_apellido": { "confidence": "0.99", "value": "GOMEZ", "status": "processed_successfully" },
        "primer_nombre": { "confidence": "0.99", "value": "JUAN", "status": "processed_successfully" },
        "otros_nombres": { "confidence": "0.99", "value": "CARLOS", "status": "processed_successfully" },
        "numero_identificacion": { "confidence": "0.99", "value": "1023456789", "status": "processed_successfully" },
        "dv": { "confidence": "0.99", "value": "5", "status": "processed_successfully" }
      },
      "liquidDataDetail": null,
      "issueDate": { "$date": "2023-05-03T05:00:00.000Z" },
      "validityDays": null
    },
    "status": { "value": "NUEVO", "lastChangeDate": { "$date": "2026-03-12T14:10:56.743Z" } },
    "ingestionVersion": "v1.0.0 - LegacySQL"
  }
]
```

---

## Reference: the shipped bank scenario, filled in

This is what a completed `collection.md` looks like, matching `data/sample/activity_events.ts`.

- **Name:** `activity_events`
- **One document is:** one operational event at a bank (a login, a balance query, a transfer, a user change).
- **Approximate volume:** ~60 records.

Fields: `_id` (string, `evt_0001`), `userId` / `userName` (string, the actor), `action` (string enum), `amount` (number, minor units, non-zero only for transfers), `channel` (string enum), `status` (string enum), `timestamp` (Date, UTC).

Enums: `action` = `LOGIN`, `BALANCE_QUERY`, `TRANSFER_INITIATED`, `TRANSFER_APPROVED`, `USER_CREATED`, `USER_MODIFIED`; `channel` = `WEB`, `MOBILE`, `API`, `BRANCH`; `status` = `SUCCESS`, `FAILED`, `PENDING`.

Units: `amount` in minor units (cents); `1500000` means 15,000.00.

Consistency rules: only `TRANSFER_INITIATED` and `TRANSFER_APPROVED` carry a non-zero `amount`; per-user successful-transfer totals sum to the global total.

Verifiable facts: "largest transfer this month" is a single $25,000.00 transfer dated this month, with a larger $30,000.00 transfer dated last month so the month filter matters; a dual-control violation where one operator both initiates and approves the same high-value transfer, for the hybrid demo.
