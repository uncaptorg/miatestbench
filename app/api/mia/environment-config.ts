import { NextRequest } from "next/server";

export type MiaEnvironment = "local" | "staging" | "production";

export type MiaEnvironmentOption = {
  key: MiaEnvironment;
  label: string;
  isConfigured: boolean;
};

type MiaEnvironmentConfig = {
  baseUrl: string;
  token: string;
};

const DEFAULT_MIA_BASE_URL = "http://localhost:9000";
const ENVIRONMENT_ORDER: MiaEnvironment[] = ["local", "staging", "production"];

const ENVIRONMENT_LABELS: Record<MiaEnvironment, string> = {
  local: "Local",
  staging: "Staging",
  production: "Production",
};

const normalize = (value?: string) => value?.trim() ?? "";

const isMiaEnvironment = (value: string): value is MiaEnvironment =>
  ENVIRONMENT_ORDER.includes(value as MiaEnvironment);

const getScopedEnv = (baseKey: string, environment: MiaEnvironment) =>
  normalize(process.env[`${baseKey}_${environment.toUpperCase()}`]);

const getBaseUrlForEnvironment = (environment: MiaEnvironment) => {
  const scopedBaseUrl = getScopedEnv("MIA_API_BASE_URL", environment);
  const fallbackBaseUrl = normalize(process.env.MIA_API_BASE_URL);
  const baseUrl = scopedBaseUrl || fallbackBaseUrl || DEFAULT_MIA_BASE_URL;
  return baseUrl.replace(/\/$/, "");
};

const getTokenForEnvironment = (environment: MiaEnvironment) => {
  const scopedToken = getScopedEnv("MIA_API_TOKEN", environment);
  const fallbackToken = normalize(process.env.MIA_API_TOKEN);
  return scopedToken || fallbackToken;
};

export const resolveRequestedEnvironment = (request: NextRequest): MiaEnvironment => {
  const headerValue = normalize(request.headers.get("x-mia-environment")?.toLowerCase());
  if (headerValue && isMiaEnvironment(headerValue)) {
    return headerValue;
  }

  const defaultValue = normalize(process.env.MIA_API_DEFAULT_ENVIRONMENT?.toLowerCase());
  if (defaultValue && isMiaEnvironment(defaultValue)) {
    return defaultValue;
  }

  return "local";
};

export const getMiaEnvironmentConfig = (environment: MiaEnvironment): MiaEnvironmentConfig => ({
  baseUrl: getBaseUrlForEnvironment(environment),
  token: getTokenForEnvironment(environment),
});

export const getMiaEnvironmentOptions = (): MiaEnvironmentOption[] => {
  return ENVIRONMENT_ORDER.map((environment) => {
    const scopedBaseUrl = getScopedEnv("MIA_API_BASE_URL", environment);
    const fallbackBaseUrl = normalize(process.env.MIA_API_BASE_URL);

    return {
      key: environment,
      label: ENVIRONMENT_LABELS[environment],
      isConfigured: Boolean(scopedBaseUrl || fallbackBaseUrl),
    };
  });
};
