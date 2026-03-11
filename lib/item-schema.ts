import { z } from "zod";

import { normalizeAsin } from "@/lib/normalization";
import { ACQUISITION_TYPES, DISPOSITION_TYPES } from "@/lib/types";

const baseNotesSchema = z
  .string()
  .optional()
  .nullable()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : null));

const baseDateStringSchema = z
  .string()
  .optional()
  .nullable()
  .transform((value) => (value && value.trim().length > 0 ? value : null));

export const itemPayloadSchema = z
  .object({
    asin: z.string().min(1, "ASIN is required").transform(normalizeAsin),
    title: z.string().min(1, "Title is required").transform((value) => value.trim()),
    acquisitionType: z.enum(ACQUISITION_TYPES, {
      required_error: "Acquisition type is required",
    }),
    dispositionType: z.enum(DISPOSITION_TYPES).default("KEPT"),
    receivedDate: z.string().min(1, "Received date is required"),
    receiptValueCents: z.number().int().min(0, "Receipt value must be >= 0"),
    currency: z.string().min(1).optional().default("USD"),
    soldDate: baseDateStringSchema,
    saleProceedsCents: z.number().int().min(0).nullable().optional(),
    notes: baseNotesSchema,
    videoDone: z.boolean().optional().default(false),
    videoDoneAt: baseDateStringSchema,
    videoSlaDays: z.number().int().min(1).optional().default(14),
    videoNotes: baseNotesSchema,
  })
  .superRefine((input, ctx) => {
    if ((input.dispositionType === "SOLD" || input.dispositionType === "GAVE_AWAY") && !input.soldDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Disposed date is required for SOLD or GAVE_AWAY items",
        path: ["soldDate"],
      });
    }

    if (input.dispositionType === "SOLD" && input.saleProceedsCents === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sale proceeds are required for SOLD items",
        path: ["saleProceedsCents"],
      });
    }
  })
  .transform((input) => {
    if (input.dispositionType === "KEPT") {
      return {
        ...input,
        currency: input.currency || "USD",
        soldDate: null,
        saleProceedsCents: null,
        notes: input.notes,
        videoDone: input.videoDone,
        videoDoneAt: input.videoDoneAt,
        videoSlaDays: input.videoSlaDays,
        videoNotes: input.videoNotes,
      };
    }

    if (input.dispositionType === "GAVE_AWAY") {
      return {
        ...input,
        currency: input.currency || "USD",
        saleProceedsCents: 0,
        notes: input.notes,
        videoDone: input.videoDone,
        videoDoneAt: input.videoDoneAt,
        videoSlaDays: input.videoSlaDays,
        videoNotes: input.videoNotes,
      };
    }

    return {
      ...input,
      currency: input.currency || "USD",
      saleProceedsCents: input.saleProceedsCents ?? null,
      notes: input.notes,
      videoDone: input.videoDone,
      videoDoneAt: input.videoDoneAt,
      videoSlaDays: input.videoSlaDays,
      videoNotes: input.videoNotes,
    };
  });

export const itemPatchSchema = z.object({
  asin: z.string().min(1).transform(normalizeAsin).optional(),
  title: z.string().min(1).transform((value) => value.trim()).optional(),
  acquisitionType: z.enum(ACQUISITION_TYPES).optional(),
  dispositionType: z.enum(DISPOSITION_TYPES).optional(),
  receivedDate: z.string().min(1).optional(),
  receiptValueCents: z.number().int().min(0).optional(),
  currency: z.string().min(1).optional(),
  soldDate: z.string().optional().nullable(),
  saleProceedsCents: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  videoDone: z.boolean().optional(),
  videoDoneAt: z.string().optional().nullable(),
  videoSlaDays: z.number().int().min(1).optional(),
  videoNotes: z.string().optional().nullable(),
  confirmDuplicate: z.boolean().optional(),
});

export type ItemPayload = z.infer<typeof itemPayloadSchema>;
export type ItemPatchPayload = z.infer<typeof itemPatchSchema>;
