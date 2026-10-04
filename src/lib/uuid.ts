export function createUuidV4(): string {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi) {
    throw new Error("Web Crypto is unavailable.");
  }

  if (typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return [...bytes]
    .map((byte, index) => {
      const separator = [4, 6, 8, 10].includes(index) ? "-" : "";

      return `${separator}${byte.toString(16).padStart(2, "0")}`;
    })
    .join("");
}
