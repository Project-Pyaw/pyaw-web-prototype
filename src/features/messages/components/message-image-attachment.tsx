"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import {
  getAttachmentDownload,
  type AttachmentDownload,
  type AttachmentDownloadVariant,
} from "../api/uploads-api";
import type { MessageAttachment } from "../types";

type MessageImageAttachmentProps = Readonly<{
  attachment: MessageAttachment;
  localPreviewUrl?: string;
}>;

const IMAGE_DOWNLOAD_VARIANTS = ["thumbnail", "preview", "original"] as const;

function isCurrentSignedDownload(download: AttachmentDownload | undefined) {
  if (!download) {
    return false;
  }

  const expiresAt = Date.parse(download.expiresAt);

  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function attachmentDownloadQueryKey(
  attachmentId: string,
  variant: AttachmentDownloadVariant,
) {
  return ["attachment-download", attachmentId, variant] as const;
}

function useAttachmentDownload(
  attachmentId: string,
  variant: AttachmentDownloadVariant,
  enabled: boolean,
) {
  return useQuery({
    enabled,
    queryFn: () => getAttachmentDownload(attachmentId, variant),
    queryKey: attachmentDownloadQueryKey(attachmentId, variant),
    gcTime: 0,
    refetchOnMount: "always",
    retry: false,
    staleTime: 0,
  });
}

function useImageDownload(
  attachmentId: string,
  initialVariant: AttachmentDownloadVariant,
  enabled: boolean,
) {
  const initialVariantIndex = IMAGE_DOWNLOAD_VARIANTS.indexOf(initialVariant);
  const [variantIndex, setVariantIndex] = useState(initialVariantIndex);
  const [renderFailed, setRenderFailed] = useState(false);
  const retriedUrlRef = useRef<string | null>(null);
  const expiredUrlRef = useRef<string | null>(null);
  const variant = IMAGE_DOWNLOAD_VARIANTS[variantIndex];
  const { data, isError, refetch } = useAttachmentDownload(
    attachmentId,
    variant,
    enabled,
  );
  const canTryAnotherVariant =
    variantIndex < IMAGE_DOWNLOAD_VARIANTS.length - 1;

  useEffect(() => {
    setVariantIndex(initialVariantIndex);
    setRenderFailed(false);
    retriedUrlRef.current = null;
    expiredUrlRef.current = null;
  }, [attachmentId, initialVariantIndex]);

  useEffect(() => {
    if (!enabled || !isError || !canTryAnotherVariant) {
      return;
    }

    setVariantIndex((currentIndex) => currentIndex + 1);
  }, [canTryAnotherVariant, enabled, isError]);

  useEffect(() => {
    if (
      !enabled ||
      !data ||
      isCurrentSignedDownload(data) ||
      expiredUrlRef.current === data.url
    ) {
      return;
    }

    expiredUrlRef.current = data.url;
    void refetch();
  }, [data, enabled, refetch]);

  function tryAnotherVariant() {
    if (!canTryAnotherVariant) {
      setRenderFailed(true);
      return;
    }

    retriedUrlRef.current = null;
    expiredUrlRef.current = null;
    setRenderFailed(false);
    setVariantIndex((currentIndex) => currentIndex + 1);
  }

  function handleImageError() {
    const url = data?.url;

    if (url && retriedUrlRef.current !== url) {
      retriedUrlRef.current = url;
      void refetch();
      return;
    }

    tryAnotherVariant();
  }

  const downloadUrl = data;

  return {
    handleImageError,
    isUnavailable: renderFailed || (!canTryAnotherVariant && isError),
    url:
      downloadUrl && isCurrentSignedDownload(downloadUrl)
        ? downloadUrl.url
        : undefined,
  };
}

function ImagePreviewDialog({
  attachment,
  onClose,
}: Readonly<{
  attachment: MessageAttachment;
  onClose: () => void;
}>) {
  const preview = useImageDownload(attachment.id, "preview", true);

  return (
    <div
      aria-label={`Preview ${attachment.originalName}`}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative flex max-h-full w-full max-w-5xl flex-col rounded-xl bg-surface p-3 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Close image preview"
          className="absolute right-5 top-5 z-10 grid size-10 place-items-center rounded-full bg-surface/90 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
          onClick={onClose}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="m7 7 10 10M17 7 7 17"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </button>
        <div className="grid min-h-64 place-items-center overflow-hidden rounded-lg bg-surface-muted">
          {preview.url ? (
            // Signed URLs are short-lived credentials and cannot use next/image host configuration.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={attachment.originalName}
              className="max-h-[75vh] max-w-full object-contain"
              onError={preview.handleImageError}
              src={preview.url}
            />
          ) : preview.isUnavailable ? (
            <p className="px-6 text-center text-sm text-danger" role="alert">
              Image preview is unavailable right now.
            </p>
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </div>
      </div>
    </div>
  );
}

export function MessageImageAttachment({
  attachment,
  localPreviewUrl,
}: MessageImageAttachmentProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const thumbnail = useImageDownload(
    attachment.id,
    "thumbnail",
    !localPreviewUrl && attachment.status === "READY",
  );

  useEffect(
    () => () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    },
    [localPreviewUrl],
  );

  const imageUrl = localPreviewUrl ?? thumbnail.url;

  return (
    <>
      <button
        aria-label={`Open image ${attachment.originalName}`}
        className="block w-full overflow-hidden rounded-xl bg-surface-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
        disabled={!imageUrl}
        onClick={() => setIsPreviewOpen(true)}
        type="button"
      >
        {imageUrl ? (
          // Signed URLs are short-lived credentials and cannot use next/image host configuration.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={attachment.originalName}
            className="h-auto max-h-72 w-full object-contain"
            onError={thumbnail.handleImageError}
            src={imageUrl}
          />
        ) : attachment.status === "ARCHIVED" ? (
          <span className="block px-4 py-6 text-center text-sm text-foreground-muted">
            Image is no longer available
          </span>
        ) : thumbnail.isUnavailable ? (
          <span className="block px-4 py-6 text-center text-sm text-danger">
            Image unavailable
          </span>
        ) : (
          <Skeleton className="h-44 w-full" />
        )}
      </button>
      {isPreviewOpen ? (
        <ImagePreviewDialog
          attachment={attachment}
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}
