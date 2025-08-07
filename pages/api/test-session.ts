import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  return res.status(200).json({
    authenticated: !!session,
    session: session,
    cookies: Object.keys(req.cookies),
    sessionCookie: req.cookies["next-auth.session-token"],
    method: req.method,
    url: req.url,
  });
}
