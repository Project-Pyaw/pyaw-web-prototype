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

const OTP_LENGTH = 6;
const EMPTY_OTP_SLOT = " ";

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
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const isSubmissionInProgressRef = useRef(false);
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
      otpInputRefs.current[0]?.focus();
    }
  }, [step]);

  const isPending = isRequesting || isVerifying;

  if (status === "initializing") {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <section
          aria-busy="true"
          className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-surface p-8"
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
    if (isSubmissionInProgressRef.current) {
      return;
    }

    isSubmissionInProgressRef.current = true;
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
      isSubmissionInProgressRef.current = false;
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

    if (isSubmissionInProgressRef.current) {
      return;
    }

    isSubmissionInProgressRef.current = true;
    setError(undefined);
    setIsVerifying(true);
    let shouldRestoreOtpFocus = false;

    try {
      const response = await verifyPhoneOtp(requestedPhone, otp);
      beginSession({ accessToken: response.accessToken });
      setOtp("");
      router.replace("/chat");
    } catch (verifyError) {
      setOtp("");
      setError(getErrorMessage(verifyError));
      shouldRestoreOtpFocus = true;
    } finally {
      setIsVerifying(false);
      isSubmissionInProgressRef.current = false;

      if (shouldRestoreOtpFocus) {
        requestAnimationFrame(() => focusOtpInput(0));
      }
    }
  }

  function returnToPhoneEntry() {
    setStep("phone");
    setOtp("");
    setRequestedPhone("");
    setError(undefined);
  }

  function getOtpDigit(index: number): string {
    const value = otp[index];
    return value && /\d/.test(value) ? value : "";
  }

  function focusOtpInput(index: number): void {
    otpInputRefs.current[index]?.focus();
  }

  function setOtpDigits(startIndex: number, digits: string): void {
    setOtp((currentOtp) => {
      const otpSlots = currentOtp.padEnd(OTP_LENGTH, EMPTY_OTP_SLOT).split("");

      digits.split("").forEach((digit, offset) => {
        const index = startIndex + offset;
        if (index < OTP_LENGTH) {
          otpSlots[index] = digit;
        }
      });

      return otpSlots.join("");
    });
    setError(undefined);
  }

  function handleOtpChange(index: number, value: string): void {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      setOtpDigits(index, EMPTY_OTP_SLOT);
      return;
    }

    if (digits.length >= OTP_LENGTH) {
      setOtp(digits.slice(0, OTP_LENGTH));
      setError(undefined);
      focusOtpInput(OTP_LENGTH - 1);
      return;
    }

    setOtpDigits(index, digits);
    focusOtpInput(Math.min(index + digits.length, OTP_LENGTH - 1));
  }

  function handleOtpKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === "Backspace") {
      if (getOtpDigit(index)) {
        event.preventDefault();
        setOtpDigits(index, EMPTY_OTP_SLOT);
      } else if (index > 0) {
        event.preventDefault();
        focusOtpInput(index - 1);
      }

      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusOtpInput(index - 1);
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusOtpInput(index + 1);
    }
  }

  function handleOtpPaste(index: number, value: string): void {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      return;
    }

    if (digits.length >= OTP_LENGTH) {
      setOtp(digits.slice(0, OTP_LENGTH));
      setError(undefined);
      focusOtpInput(OTP_LENGTH - 1);
      return;
    }

    setOtpDigits(index, digits);
    focusOtpInput(Math.min(index + digits.length, OTP_LENGTH - 1));
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-surface p-8 sm:p-10">
        <div className="space-y-2">
          <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            Pyaw
          </p>
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
                className="w-full rounded-full border border-border bg-input px-4 py-3 text-foreground outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/20"
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
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
                id="otp-label"
              >
                Six-digit code
              </label>
              <div
                aria-busy={isVerifying}
                aria-describedby={error ? "otp-error" : undefined}
                aria-labelledby="otp-label"
                className="grid grid-cols-6 gap-2"
                role="group"
              >
                {Array.from({ length: OTP_LENGTH }, (_, index) => {
                  const digit = getOtpDigit(index);
                  const inputStateClassName = error
                    ? "border-danger focus:border-danger focus:ring-danger/20"
                    : digit
                      ? "border-primary/40 bg-surface focus:border-focus focus:ring-focus/20"
                      : "border-border focus:border-focus focus:ring-focus/20";

                  return (
                    <input
                      aria-invalid={Boolean(error)}
                      aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      className={`aspect-square min-w-0 rounded-xl border bg-input text-center font-mono text-xl font-semibold text-foreground outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${isVerifying ? "cursor-wait animate-pulse" : ""} ${inputStateClassName}`}
                      disabled={isPending}
                      inputMode="numeric"
                      key={index}
                      maxLength={OTP_LENGTH}
                      onChange={(event) =>
                        handleOtpChange(index, event.target.value)
                      }
                      onFocus={(event) => event.currentTarget.select()}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={(event) => {
                        event.preventDefault();
                        handleOtpPaste(
                          index,
                          event.clipboardData.getData("text"),
                        );
                      }}
                      pattern="[0-9]*"
                      ref={(element) => {
                        otpInputRefs.current[index] = element;
                      }}
                      type="text"
                      value={digit}
                    />
                  );
                })}
              </div>
            </div>

            {error ? (
              <p className="text-sm text-danger" id="otp-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
