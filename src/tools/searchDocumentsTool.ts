import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { Filter, Document } from "mongodb";
import { getDb } from "../db/client";
import { getConfig } from "../config";
import { PROCESS_NAMES, SUBTYPES, DOC_STATUSES } from "../query/schema";

/**
 * Builds a human-readable summary of a liquidData document so the model can
 * reason about it without being flooded with the full OCR payload.
 */
function summarizeDocument(doc: Document): Record<string, unknown> {
  const subtype = String(doc.document?.subtype ?? "");
  const ld = doc.document?.liquidData as Record<string, unknown> | undefined;

  let ocrSummary: Record<string, unknown> = {};
  if (subtype === "Carta laboral" && ld) {
    const rj = ld.result_json as Record<string, unknown> | undefined;
    ocrSummary = {
      nombre_empleado: (rj?.nombre_empleado as { value?: string } | undefined)?.value,
      nombre_empleador: (rj?.nombre_empleador as { value?: string } | undefined)?.value,
      cargo: (rj?.cargo as { value?: string } | undefined)?.value,
      contrato: (rj?.contrato as { value?: string } | undefined)?.value,
    };
  } else if (subtype === "Cedula de Ciudadania" && ld) {
    ocrSummary = {
      nombres: (ld.nombres as { value?: string } | undefined)?.value,
      apellidos: (ld.apellidos as { value?: string } | undefined)?.value,
      numero_documento: (ld.numero_documento as { value?: string } | undefined)?.value,
      lugar_expedicion: (ld.lugar_expedicion as { value?: string } | undefined)?.value,
      fecha_nacimiento: (ld.fecha_nacimiento as { value?: string } | undefined)?.value,
    };
  } else if (subtype === "RUT" && ld) {
    ocrSummary = {
      primer_nombre: (ld.primer_nombre as { value?: string } | undefined)?.value,
      primer_apellido: (ld.primer_apellido as { value?: string } | undefined)?.value,
      numero_identificacion: (ld.numero_identificacion as { value?: string } | undefined)?.value,
    };
  }

  return {
    _id: doc._id,
    subtype,
    status: doc.status?.value,
    process: doc.process?.name,
    referenceId: doc.process?.referenceId,
    channel: doc.processing?.channel?.value,
    bdtlRecordDate: doc.bdtlRecordDate,
    ...ocrSummary,
  };
}

export const searchDocuments = tool(
  async ({ subtype, status, process, referenceId, startDate, endDate }): Promise<string> => {
    const cfg = getConfig();
    const db = await getDb();

    const filter: Filter<Document> = {};

    if (subtype) filter["document.subtype"] = subtype;
    if (status) filter["status.value"] = status;
    if (process) filter["process.name"] = process;
    if (referenceId) filter["process.referenceId"] = referenceId;

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter["$gte"] = new Date(startDate);
      if (endDate) dateFilter["$lte"] = new Date(endDate);
      filter["bdtlRecordDate"] = dateFilter as unknown as Date;
    }

    const docs = await db
      .collection(cfg.EVENTS_COLLECTION)
      .find(filter)
      .sort({ bdtlRecordDate: -1 })
      .limit(cfg.QUERY_RESULT_CAP)
      .maxTimeMS(cfg.QUERY_MAX_TIME_MS)
      .toArray();

    if (docs.length === 0) {
      return JSON.stringify({ total: 0, documents: [], message: "No se encontraron documentos con los filtros indicados." });
    }

    return JSON.stringify(
      {
        total: docs.length,
        capped: docs.length === cfg.QUERY_RESULT_CAP,
        documents: docs.map(summarizeDocument),
      },
      null,
      2,
    );
  },
  {
    name: "search_documents",
    description:
      "Busca documentos en la colección liquidData aplicando filtros opcionales. " +
      "Úsala cuando el usuario quiera listar, explorar o encontrar documentos específicos por tipo, estado, " +
      "proceso, referencia o rango de fechas. Devuelve un resumen de cada documento (no el OCR completo). " +
      "Si no se especifica ningún filtro devuelve los documentos más recientes hasta el límite configurado.",
    schema: z.object({
      subtype: z
        .enum(SUBTYPES)
        .optional()
        .describe(`Filtrar por tipo de documento: ${SUBTYPES.join(" | ")}.`),
      status: z
        .enum(DOC_STATUSES)
        .optional()
        .describe("Filtrar por estado del registro: NUEVO | ACTUALIZADO."),
      process: z
        .enum(PROCESS_NAMES)
        .optional()
        .describe(`Filtrar por proceso bancario: ${PROCESS_NAMES.join(" | ")}.`),
      referenceId: z
        .string()
        .optional()
        .describe('Filtrar por ID del archivo de origen, ej. "T001_AFD001.pdf".'),
      startDate: z
        .string()
        .optional()
        .describe("Fecha de inicio del rango (ISO 8601, ej. \"2026-01-01\"). Filtra por bdtlRecordDate >= startDate."),
      endDate: z
        .string()
        .optional()
        .describe("Fecha de fin del rango (ISO 8601, ej. \"2026-12-31\"). Filtra por bdtlRecordDate <= endDate."),
    }),
  },
);
