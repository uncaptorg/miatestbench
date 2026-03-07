import { NextRequest } from "next/server";
import { getMiaEnvironmentConfig, resolveRequestedEnvironment } from "../environment-config";

const getBearerToken = (request: NextRequest, environmentToken: string) => {
  const headerToken = request.headers.get("x-mia-token")?.trim();
  if (headerToken) {
    return headerToken;
  }

  return environmentToken;
};

const getForwardHeaders = (request: NextRequest, token: string) => {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");

  if (accept) {
    headers.set("accept", accept);
  }

  if (contentType) {
    headers.set("content-type", contentType);
  }

  headers.set("authorization", `Bearer ${token}`);

  return headers;
};

const createTargetUrl = (request: NextRequest, path: string[], baseUrl: string) => {
  const joinedPath = path.join("/");
  return `${baseUrl}/${joinedPath}${request.nextUrl.search}`;
};

const proxy = async (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST",
) => {
  const environment = resolveRequestedEnvironment(request);
  const environmentConfig = getMiaEnvironmentConfig(environment);
  const token = getBearerToken(request, environmentConfig.token);
  if (!token) {
    return Response.json(
      {
        error:
          "Missing MIA token. Set MIA_API_TOKEN or MIA_API_TOKEN_<ENV> in server env, or send x-mia-token header.",
      },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  if (!path || path.length === 0) {
    return Response.json({ error: "Missing proxy path." }, { status: 400 });
  }

  const targetUrl = createTargetUrl(request, path, environmentConfig.baseUrl);
  const headers = getForwardHeaders(request, token);
  const body =
    method === "GET" ? undefined : await request.arrayBuffer().then((data) => (data.byteLength ? data : undefined));

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const responseHeaders = new Headers();
    const contentType = upstreamResponse.headers.get("content-type");

    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      {
        error: "Failed to connect to the MIA backend from proxy.",
      },
      { status: 502 },
    );
  }
};

export const GET = async (request: NextRequest, context: { params: Promise<{ path: string[] }> }) =>
  proxy(request, context, "GET");

export const POST = async (request: NextRequest, context: { params: Promise<{ path: string[] }> }) =>
  proxy(request, context, "POST");
