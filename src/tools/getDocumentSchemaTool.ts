import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SUBTYPES, type Subtype } from "../query/schema";

/**
 * Schema reference for each liquidData document subtype.
 * Returns field names, types, and example values so the user or the model can
 * understand what data is stored and formulate better queries.
 */
const SUBTYPE_SCHEMAS: Record<Subtype, string> = {
  "Carta laboral": `Subtype: Carta laboral
Descripción: Carta de trabajo emitida por el empleador para un proceso bancario.

Campos OCR — cada hoja sigue el patrón { confidence: string, value: string, status: "processed_successfully" }:
  document.liquidData.result_json.nombre_empleado.value      string  Nombre completo del empleado
  document.liquidData.result_json.nombre_empleador.value     string  Nombre del empleador (ej. "SURA SA", "BANCOLOMBIA SA", "AVIANCA SA")
  document.liquidData.result_json.cargo.value                string  Cargo del empleado (ej. "ASESORA VENTAS", "ANALISTA FINANCIERO", "GERENTE COMERCIAL")
  document.liquidData.result_json.contrato.value             string  Tipo de contrato: INDEFINIDO | FIJO | PRESTACION SERVICIOS
  document.liquidData.result_json.tipo_id.value              string  Tipo de ID del empleado (ej. "CEDULA DE CIUDADANIA")
  document.liquidData.result_json.id.value                   string  Número de ID del empleado
  document.liquidData.result_json.tipo_id_empleador.value    string  Tipo de ID del empleador (ej. "NIT")
  document.liquidData.result_json.id_empleador.value         string  NIT del empleador
  document.liquidData.result_json.digito_verificacion.value  string  Dígito verificador del NIT
  document.liquidData.result_json.fecha_expedicion.value     string  Fecha de expedición YYYY-MM-DD
  document.liquidData.result_json.fecha_vinculacion.value    string  Fecha de vinculación del empleado YYYY-MM-DD
  document.liquidData.result_json.ingresos                   array   Lista de ingresos; cada entrada tiene:
    .descripcion.value                                         string  Tipo de ingreso: "SALARIO BASICO" | "SUBSIDIO TRANSPORTE" | "OTRO"
    .cantidad.value                                            string  Monto en COP como string entero (ej. "2225550" = 2.225.550 COP)

Nota: los montos son strings; usa $toInt o $toDouble para comparaciones numéricas.`,

  "Cedula de Ciudadania": `Subtype: Cedula de Ciudadania
Descripción: Cédula de ciudadanía colombiana digitalizada por OCR.

Campos OCR — cada hoja sigue el patrón { confidence: string, value: string, status: "processed_successfully" }:
  document.liquidData.nombres.value            string  Nombres (primer y segundo nombre)
  document.liquidData.apellidos.value          string  Apellidos (primer y segundo apellido)
  document.liquidData.numero_documento.value   string  Número de la cédula
  document.liquidData.fecha_nacimiento.value   string  Fecha de nacimiento YYYY-MM-DD
  document.liquidData.lugar_expedicion.value   string  Ciudad de expedición (ej. "MANIZALES", "BOGOTA", "MEDELLIN")

Nota: fecha_nacimiento es string YYYY-MM-DD; la comparación lexicográfica funciona para rangos de fechas.`,

  "RUT": `Subtype: RUT
Descripción: Registro Único Tributario digitalizado por OCR.

Campos OCR — cada hoja sigue el patrón { confidence: string, value: string, status: "processed_successfully" }:
  document.liquidData.primer_apellido.value         string  Primer apellido
  document.liquidData.segundo_apellido.value        string  Segundo apellido
  document.liquidData.primer_nombre.value           string  Primer nombre
  document.liquidData.otros_nombres.value           string  Otros nombres
  document.liquidData.numero_identificacion.value   string  NIT o número de identificación tributaria
  document.liquidData.dv.value                      string  Dígito verificador del NIT`,
};

/**
 * Common top-level fields present in every document regardless of subtype.
 */
const COMMON_FIELDS = `Campos comunes a todos los subtipos:
  _id                          string  ID del documento (ej. "doc_0001")
  bdtlRecordDate               Date    Fecha de ingreso al sistema
  bdtlCleanupDate              Date    Fecha programada de limpieza (~33 días después de bdtlRecordDate)
  process.name                 string  Proceso bancario: "Requerimientos Banco" | "Vinculación Banco" | "Solicitud de Prestamo"
  process.referenceId          string  ID del archivo de origen (ej. "T001_AFD001.pdf")
  process.entity.value         string  Entidad que originó el proceso
  processing.channel.value     string  Canal de ingesta: "CARPETA COMPARTIDA" | "CORREO" | "MULTIFUNCIONAL"
  processing.startDate         Date    Inicio del procesamiento
  processing.endDate           Date    Fin del procesamiento
  document.subtype             string  Tipo de documento: ${SUBTYPES.join(" | ")}
  status.value                 string  Estado del registro: NUEVO | ACTUALIZADO
  status.lastChangeDate        Date    Fecha del último cambio de estado
  ingestionVersion             string  Versión del pipeline (ej. "v1.0.0 - LegacySQL")`;

export const getDocumentSchema = tool(
  async ({ subtype }): Promise<string> => {
    if (subtype) {
      const schema = SUBTYPE_SCHEMAS[subtype as Subtype];
      if (!schema) {
        return `Subtype "${subtype}" no reconocido. Valores válidos: ${SUBTYPES.join(", ")}.`;
      }
      return `${COMMON_FIELDS}\n\n${schema}`;
    }
    // No subtype specified: return the overview for all subtypes.
    const all = SUBTYPES.map((s) => SUBTYPE_SCHEMAS[s]).join("\n\n---\n\n");
    return `${COMMON_FIELDS}\n\n---\n\n${all}`;
  },
  {
    name: "get_document_schema",
    description:
      "Devuelve los campos y su descripción para un subtype de documento en la colección liquidData. " +
      "Úsala cuando el usuario pregunte qué campos tiene un tipo de documento, qué información se extrae " +
      `por OCR, o cómo están estructurados los datos. Subtypes disponibles: ${SUBTYPES.join(", ")}.`,
    schema: z.object({
      subtype: z
        .string()
        .optional()
        .describe(
          `Subtype del documento a consultar. Valores válidos: ${SUBTYPES.join(", ")}. ` +
            "Si se omite, devuelve el esquema de todos los subtipos.",
        ),
    }),
  },
);
