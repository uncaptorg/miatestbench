import { NextRequest } from "next/server";
import { getMiaEnvironmentOptions, resolveRequestedEnvironment } from "../environment-config";

export const GET = async (request: NextRequest) => {
  const environments = getMiaEnvironmentOptions();
  const defaultEnvironment = resolveRequestedEnvironment(request);

  return Response.json({
    defaultEnvironment,
    environments,
  });
};
