import { authenticatedApi } from "@/features/auth/session/session";
import {
  type PresignedUpload,
  uploadImageBytes,
} from "@/features/messages/api/uploads-api";

type AvatarUploadIntent = Readonly<{
  id: string;
}>;

type CreateAvatarUploadResponse = Readonly<{
  upload: PresignedUpload;
  uploadIntent: AvatarUploadIntent;
}>;

type CompleteAvatarUploadResponse = Readonly<{
  target: Readonly<{
    accountId?: string;
  }>;
  uploadIntent: AvatarUploadIntent;
}>;

export function createAvatarUpload(
  file: File,
): Promise<CreateAvatarUploadResponse> {
  return authenticatedApi.post<
    CreateAvatarUploadResponse,
    Readonly<{
      mimeType: string;
      originalName: string;
      purpose: "AVATAR";
      sizeBytes: number;
      type: "IMAGE";
    }>
  >("/uploads", {
    mimeType: file.type,
    originalName: file.name,
    purpose: "AVATAR",
    sizeBytes: file.size,
    type: "IMAGE",
  });
}

export function uploadAvatarBytes(
  file: File,
  upload: PresignedUpload,
): Promise<void> {
  return uploadImageBytes(file, upload);
}

export function completeAvatarUpload(
  uploadIntentId: string,
): Promise<CompleteAvatarUploadResponse> {
  return authenticatedApi.post<CompleteAvatarUploadResponse, undefined>(
    `/uploads/${uploadIntentId}/complete`,
    undefined,
  );
}
