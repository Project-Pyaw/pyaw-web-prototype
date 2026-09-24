export type AppEnvironment = string;

export type PublicConfig = Readonly<{
  appEnv: AppEnvironment;
  apiBaseUrl: string;
  socketUrl: string;
}>;

const publicEnvironment = {
  appEnv: process.env.NEXT_PUBLIC_APP_ENV,
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
};

function readRequiredPublicEnv(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }

  return value;
}

function readHttpUrl(name: string, value: string | undefined): string {
  const urlValue = readRequiredPublicEnv(name, value);

  try {
    const url = new URL(urlValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL.`);
  }

  return urlValue.replace(/\/$/, "");
}

export function getPublicConfig(): PublicConfig {
  const appEnv = readRequiredPublicEnv(
    "NEXT_PUBLIC_APP_ENV",
    publicEnvironment.appEnv,
  );

  if (!/^[a-z][a-z0-9-]*$/.test(appEnv)) {
    throw new Error(
      "NEXT_PUBLIC_APP_ENV must use lowercase letters, numbers, and hyphens.",
    );
  }

  return {
    appEnv,
    apiBaseUrl: readHttpUrl(
      "NEXT_PUBLIC_API_BASE_URL",
      publicEnvironment.apiBaseUrl,
    ),
    socketUrl: readHttpUrl(
      "NEXT_PUBLIC_SOCKET_URL",
      publicEnvironment.socketUrl,
    ),
  };
}
