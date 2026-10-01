import { authenticatedApi } from "@/features/auth/session/session";

import type { MessageAttachment } from "../types";

type CreateImageUploadInput = Readonly<{
  type: "IMAGE";
  purpose: "MESSAGE";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}>;

export type PresignedUpload = Readonly<{
  method: "PUT";
  url: string;
  expiresAt: string;
  requiredHeaders: Readonly<Record<string, string>>;
}>;

type CreateImageUploadResponse = Readonly<{
  attachment: MessageAttachment;
  upload: PresignedUpload;
}>;

export function createImageUpload(
  input: CreateImageUploadInput,
): Promise<CreateImageUploadResponse> {
  return authenticatedApi.post<
    CreateImageUploadResponse,
    CreateImageUploadInput
  >("/uploads", input);
}

export function completeImageUpload(
  attachmentId: string,
): Promise<MessageAttachment> {
  return authenticatedApi.post<MessageAttachment, undefined>(
    `/uploads/${attachmentId}/complete`,
    undefined,
  );
}

export async function uploadImageBytes(
  file: File,
  upload: PresignedUpload,
): Promise<void> {
  const response = await fetch(upload.url, {
    body: file,
    cache: "no-store",
    credentials: "omit",
    headers: upload.requiredHeaders,
    method: upload.method,
  });

  if (!response.ok) {
    throw new Error("IMAGE_UPLOAD_PUT_FAILED");
  }
}

export type AttachmentDownloadVariant = "original" | "preview" | "thumbnail";

export type AttachmentDownload = Readonly<{
  url: string;
  expiresAt: string;
}>;

export function getAttachmentDownload(
  attachmentId: string,
  variant: AttachmentDownloadVariant,
): Promise<AttachmentDownload> {
  return authenticatedApi.get<AttachmentDownload>(
    `/attachments/${attachmentId}/download?variant=${variant}`,
    { cache: "no-store" },
  );
}
