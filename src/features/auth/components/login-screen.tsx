"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requestPhoneOtp, verifyPhoneOtp } from "@/features/auth/api/auth-api";
import {
  beginSession,
  bootstrapSession,
} from "@/features/auth/session/session";
import { useSessionStatus } from "@/features/auth/session/use-session-status";
import { ApiError } from "@/lib/api/api-error";

type LoginStep = "phone" | "otp";

const errorMessages: Record<string, string> = {
  ACCOUNT_INACTIVE: "This account is not active.",
  NETWORK_ERROR: "Unable to reach the service. Please try again.",
  OTP_INVALID: "The code is invalid or expired.",
  OTP_RESEND_COOLDOWN: "Please wait before requesting another code.",
  PHONE_NUMBER_INVALID: "Enter a valid phone number.",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return (
      errorMessages[error.code] ?? "Something went wrong. Please try again."
    );
  }

  return "Something went wrong. Please try again.";
}

function maskPhoneNumber(phone: string): string {
  if (phone.length <= 4) {
    return phone;
  }

  return `${phone.slice(0, 2)}•••${phone.slice(-3)}`;
}

export function LoginScreen() {
  const router = useRouter();
  const { bootstrapError, status } = useSessionStatus();
  const otpInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [requestedPhone, setRequestedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/chat");
    }
  }, [router, status]);

  useEffect(() => {
    if (step === "otp") {
      otpInputRef.current?.focus();
    }
  }, [step]);

  const isPending = isRequesting || isVerifying;

  if (status === "initializing") {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <section
          aria-busy="true"
          className="w-full max-w-md space-y-5 rounded-xl border border-border bg-surface p-8 shadow-sm"
        >
          <span className="sr-only" role="status">
            Loading your account…
          </span>
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-5 w-full rounded" />
          {bootstrapError ? (
            <button
              className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
              onClick={() => void bootstrapSession()}
              type="button"
            >
              Try again
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  async function requestOtpForPhone(identifier: string) {
    setError(undefined);
    setIsRequesting(true);

    try {
      await requestPhoneOtp(identifier);
      setRequestedPhone(identifier);
      setOtp("");
      setStep("otp");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsRequesting(false);
    }
  }

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifier = phone.trim();

    if (!identifier) {
      setError("Enter your phone number.");
      return;
    }

    await requestOtpForPhone(identifier);
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit code.");
      return;
    }

    setError(undefined);
    setIsVerifying(true);

    try {
      const response = await verifyPhoneOtp(requestedPhone, otp);
      beginSession({ accessToken: response.accessToken });
      setOtp("");
      router.replace("/chat");
    } catch (verifyError) {
      setOtp("");
      setError(getErrorMessage(verifyError));
      otpInputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  }

  function returnToPhoneEntry() {
    setStep("phone");
    setOtp("");
    setRequestedPhone("");
    setError(undefined);
  }

  function handleOtpChange(value: string) {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
    setError(undefined);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="w-full max-w-md space-y-6 rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Pyaw</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {step === "phone" ? "Sign in with your phone" : "Enter your code"}
          </h1>
          <p className="text-sm leading-6 text-foreground-muted">
            {step === "phone"
              ? "We’ll send a one-time code to continue."
              : `We sent a code to ${maskPhoneNumber(requestedPhone)}.`}
          </p>
        </div>

        {step === "phone" ? (
          <form className="space-y-5" onSubmit={handleRequestOtp}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="phone"
              >
                Phone number
              </label>
              <input
                autoComplete="tel"
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/20"
                disabled={isPending}
                id="phone"
                inputMode="tel"
                maxLength={320}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError(undefined);
                }}
                placeholder="09 123 456 789"
                required
                type="tel"
                value={phone}
              />
            </div>

            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isRequesting ? "Sending code…" : "Send code"}
            </button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleVerifyOtp}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="otp"
              >
                Six-digit code
              </label>
              <input
                aria-describedby={error ? "otp-error" : undefined}
                autoComplete="one-time-code"
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 font-mono text-lg tracking-[0.35em] text-foreground outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/20"
                disabled={isPending}
                id="otp"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => handleOtpChange(event.target.value)}
                pattern="[0-9]{6}"
                ref={otpInputRef}
                required
                type="text"
                value={otp}
              />
            </div>

            {error ? (
              <p className="text-sm text-danger" id="otp-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isVerifying ? "Verifying…" : "Verify and continue"}
            </button>
            <div className="flex justify-between gap-4 text-sm">
              <button
                className="text-primary underline underline-offset-4 disabled:opacity-60"
                disabled={isPending}
                onClick={returnToPhoneEntry}
                type="button"
              >
                Change number
              </button>
              <button
                className="text-primary underline underline-offset-4 disabled:opacity-60"
                disabled={isPending}
                onClick={() => void requestOtpForPhone(requestedPhone)}
                type="button"
              >
                Resend code
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
