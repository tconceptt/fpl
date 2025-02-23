import { headers } from "next/headers";

export async function getUrlParam(param: string) {
  const headersList = await headers();
  const fullUrl = headersList.get("x-url") || "";
  const url = new URL(fullUrl);
  const searchParams = url.searchParams;
  return searchParams.get(param);
}
