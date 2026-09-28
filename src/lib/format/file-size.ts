const KILOBYTE = 1024;
const MEBIBYTE = KILOBYTE * KILOBYTE;

function formatRoundedValue(value: number): string {
  const roundedValue = Math.round(value * 10) / 10;

  return Number.isInteger(roundedValue)
    ? String(roundedValue)
    : roundedValue.toFixed(1);
}

export function formatFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 B";
  }

  if (sizeBytes < KILOBYTE) {
    return `${Math.round(sizeBytes)} B`;
  }

  if (sizeBytes < MEBIBYTE) {
    return `${formatRoundedValue(sizeBytes / KILOBYTE)} KB`;
  }

  return `${formatRoundedValue(sizeBytes / MEBIBYTE)} MB`;
}
