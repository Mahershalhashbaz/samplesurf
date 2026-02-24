export const ACQUISITION_TYPES = ["SAMPLE", "PURCHASED"] as const;
export type AcquisitionType = (typeof ACQUISITION_TYPES)[number];

export const DISPOSITION_TYPES = ["KEPT", "SOLD", "GAVE_AWAY"] as const;
export type DispositionType = (typeof DISPOSITION_TYPES)[number];

export function isAcquisitionType(value: string | null | undefined): value is AcquisitionType {
  return Boolean(value && ACQUISITION_TYPES.includes(value as AcquisitionType));
}

export function isDispositionType(value: string | null | undefined): value is DispositionType {
  return Boolean(value && DISPOSITION_TYPES.includes(value as DispositionType));
}

export function dispositionLabel(type: DispositionType): string {
  switch (type) {
    case "KEPT":
      return "Kept";
    case "SOLD":
      return "Sold";
    case "GAVE_AWAY":
      return "Gave away";
    default:
      return type;
  }
}
