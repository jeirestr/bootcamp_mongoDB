/**
 * Plain-language descriptions of the structured collections, fed to the model
 * so it generates better MongoDB pipelines. This is a PROMPT AID, not a gate:
 * it improves query quality; it does not validate or restrict anything.
 *
 * ---------------------------------------------------------------------------
 * ADAPTING THIS FILE TO YOUR DATA
 *
 * This is the highest-leverage file for a structured or hybrid team. The model
 * writes its pipeline from this text alone; it never sees your documents. A
 * vague description here produces confidently wrong answers, which is the
 * failure mode that costs the most time to notice.
 *
 * Replace LIQUID_DATA_DESCRIPTION with your own, and cover five things:
 *
 * 1. One line saying what a single document IS. "One document per OCR result"
 *    tells the model whether to count documents or group them.
 * 2. Every field the model may need, with its type. Call out fields where the
 *    stored type differs from how people say it: e.g. amounts as strings,
 *    dates as YYYY-MM-DD strings rather than BSON Dates.
 * 3. Enum values verbatim. The model cannot guess that you write "SURA SA"
 *    and not "Sura SA", and a wrong literal silently matches nothing.
 * 4. Guidance mapping the questions you actually expect to the fields that
 *    answer them. Two or three concrete examples are worth more than any
 *    amount of field detail.
 * 5. The traps. Anything where the obvious pipeline is wrong: OCR values are
 *    strings so numeric comparisons need $toInt/$toDouble; date strings in
 *    liquidData are NOT BSON Dates; always filter by document.subtype first.
 *
 * Write it for a competent new colleague who has never seen your data. If a
 * sentence would not help them, it will not help the model.
 *
 * BILINGUAL NOTE: this description stays in English in every language, on
 * purpose, not by oversight. It is almost entirely field names, enum values,
 * and pipeline guidance; models read it fine cross-lingually, and translating
 * it would risk drifting against the generator that imports these enums.
 * ---------------------------------------------------------------------------
 *
 * The enums here are the single source of truth, imported by the synthetic
 * data generator so the data and the description never drift.
 */

export const PROCESS_NAMES = [
  "Requerimientos Banco",
  "Vinculación Banco",
  "Solicitud de Prestamo",
] as const;
export type ProcessName = (typeof PROCESS_NAMES)[number];

export const SUBTYPES = ["Carta laboral", "Cedula de Ciudadania", "RUT"] as const;
export type Subtype = (typeof SUBTYPES)[number];

export const DOC_STATUSES = ["NUEVO", "ACTUALIZADO"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const CHANNELS = ["CARPETA COMPARTIDA", "CORREO", "MULTIFUNCIONAL"] as const;
export type Channel = (typeof CHANNELS)[number];

export const OCR_STATUS = "processed_successfully" as const;

const LIQUID_DATA_DESCRIPTION = `Collection: liquidData
One document per OCR extraction result for a banking client document, tied to a banking process.

Top-level fields:
  _id                          string   stable id like "doc_0001"
  bdtlRecordDate               Date     BSON date when the record entered the system
  bdtlCleanupDate              Date     BSON date scheduled for cleanup (~33 days after bdtlRecordDate)
  process.name                 string   banking process; one of: ${PROCESS_NAMES.join(", ")}
  process.code                 null
  process.referenceId          string   source file id, e.g. "T001_AFD001.pdf"
  process.entity.value         string   entity that originated the process
  processing._id               string   SHA1 hex string of the processing run (NOT a MongoDB ObjectId)
  processing.startDate         Date     BSON date when processing started
  processing.endDate           Date     BSON date when processing ended
  processing.technology.value  string   always "MONGO"
  processing.channel.value     string   ingestion channel; one of: ${CHANNELS.join(", ")}
  document.subtype             string   document type; one of: ${SUBTYPES.join(", ")}
  document.liquidData          object   OCR-extracted fields; structure varies by document.subtype (see below)
  document.liquidDataDetail    null
  document.issueDate           Date     BSON date of the original document's issue date
  document.validityDays        null
  status.value                 string   record status; one of: ${DOC_STATUSES.join(", ")}
  status.lastChangeDate        Date     BSON date of the last status change
  ingestionVersion             string   pipeline version, e.g. "v1.0.0 - LegacySQL"

OCR FIELD PATTERN: every leaf field in liquidData follows { confidence: string, value: string, status: "processed_successfully" }.
Always access .value to filter or compare (e.g., "document.liquidData.nombres.value").

--- document.liquidData when document.subtype = "Carta laboral" ---
  document.liquidData.transaction_id                              string  processing hash
  document.liquidData.DocID                                       string  internal document id
  document.liquidData.result_json.ingresos                        array   list of income entries; each entry has:
    .descripcion.value                                            string  income type, e.g. "SALARIO BASICO", "OTRO", "SUBSIDIO TRANSPORTE"
    .cantidad.value                                               string  amount in COP as INTEGER STRING (e.g. "2225550" = 2,225,550 COP)
  document.liquidData.result_json.nombre_empleado.value           string  full employee name
  document.liquidData.result_json.nombre_empleador.value          string  employer name, e.g. "SURA SA", "BANCOLOMBIA SA", "AVIANCA SA"
  document.liquidData.result_json.cargo.value                     string  employee role, e.g. "ASESORA VENTAS", "ANALISTA FINANCIERO", "GERENTE COMERCIAL"
  document.liquidData.result_json.contrato.value                  string  contract type, e.g. "INDEFINIDO", "FIJO", "PRESTACION SERVICIOS"
  document.liquidData.result_json.tipo_id.value                   string  employee ID type, e.g. "CEDULA DE CIUDADANIA"
  document.liquidData.result_json.id.value                        string  employee ID number
  document.liquidData.result_json.tipo_id_empleador.value         string  employer ID type, e.g. "NIT"
  document.liquidData.result_json.id_empleador.value              string  employer ID number
  document.liquidData.result_json.fecha_expedicion.value          string  issue date as YYYY-MM-DD string
  document.liquidData.result_json.fecha_vinculacion.value         string  employee start date as YYYY-MM-DD string
  document.liquidData.result_json.digito_verificacion.value       string  employer NIT verification digit
  document.liquidData.result_json.fecha_contratos                 array   past contract dates (usually empty)
  document.liquidData.result_json.files_to_process                array   structural duplicate of the above fields (by design, same content)

--- document.liquidData when document.subtype = "Cedula de Ciudadania" ---
  document.liquidData.nombres.value           string  first and middle name
  document.liquidData.apellidos.value         string  first and second surname
  document.liquidData.numero_documento.value  string  ID card number
  document.liquidData.fecha_nacimiento.value  string  birth date as YYYY-MM-DD string
  document.liquidData.lugar_expedicion.value  string  city where the ID was issued, e.g. "MANIZALES", "BOGOTA", "MEDELLIN"

--- document.liquidData when document.subtype = "RUT" ---
  document.liquidData.primer_apellido.value       string  first surname
  document.liquidData.segundo_apellido.value      string  second surname
  document.liquidData.primer_nombre.value         string  first given name
  document.liquidData.otros_nombres.value         string  second or other names
  document.liquidData.numero_identificacion.value string  NIT or tax ID number
  document.liquidData.dv.value                    string  NIT verification digit

Guidance for pipelines:
  - "clients with salary above X" / "salario mayor a X":
    ALWAYS filter by subtype first, then match on ingresos. cantidad.value is a STRING —
    use $toInt or $toDouble to compare numerically. Recommended pattern:
      [
        { "$match": { "document.subtype": "Carta laboral" } },
        { "$unwind": "$document.liquidData.result_json.ingresos" },
        { "$match": {
            "document.liquidData.result_json.ingresos.descripcion.value": "SALARIO BASICO",
            "$expr": { "$gt": [
              { "$toInt": "$document.liquidData.result_json.ingresos.cantidad.value" },
              2000000
            ]}
          }
        },
        { "$count": "total" }
      ]
  - "clients at employer X" / "empleados de X":
    [{ "$match": { "document.subtype": "Carta laboral",
       "document.liquidData.result_json.nombre_empleador.value": "SURA SA" }}]
  - "clients with role/cargo X":
    [{ "$match": { "document.subtype": "Carta laboral",
       "document.liquidData.result_json.cargo.value": "ASESORA VENTAS" }}]
  - "cedulas from city X" / "cédulas expedidas en X":
    [{ "$match": { "document.subtype": "Cedula de Ciudadania",
       "document.liquidData.lugar_expedicion.value": "MANIZALES" }}]
  - "people born after YYYY" / "nacidos después de YYYY":
    String comparison works because dates are YYYY-MM-DD (lexicographic = chronological):
    [{ "$match": { "document.subtype": "Cedula de Ciudadania",
       "document.liquidData.fecha_nacimiento.value": { "$gt": "1990-12-31" } }}]
  - "documents with status X": { "$match": { "status.value": "NUEVO" } }
  - "documents by process": { "$match": { "process.name": "Requerimientos Banco" } }
  - "count by subtype": [{ "$group": { "_id": "$document.subtype", "count": { "$sum": 1 } } }]

TRAPS:
  1. ALWAYS filter by document.subtype first — liquidData structure is different per subtype.
  2. All OCR values (including salary amounts) are strings. Use $toInt or $toDouble for numeric comparisons.
  3. Date strings in liquidData (fecha_expedicion, fecha_nacimiento, etc.) are YYYY-MM-DD strings,
     NOT BSON Dates. Do NOT use BSON date operators on them. Use plain string comparison ($gt, $lt, $eq).
  4. Top-level date fields (bdtlRecordDate, processing.startDate/endDate, document.issueDate,
     status.lastChangeDate) ARE BSON Dates. Use Extended JSON: { "$gte": { "$date": "2026-01-01T00:00:00Z" } }
  5. A wrong enum value silently matches nothing. Use exact case: "SURA SA" not "sura sa".`;

/**
 * Return a plain-language description of the target collection for the query
 * prompt. Unknown collections get a generic note so teams can point the tool
 * at their own data without editing this file first.
 */
export function describeCollection(name: string): string {
  if (name === "liquidData") return LIQUID_DATA_DESCRIPTION;
  return `Collection: ${name}\n(No schema description registered. Infer fields and types from the question; prefer a conservative read-only pipeline.)`;
}
