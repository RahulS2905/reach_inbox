import type { NextFunction, Request, Response } from "express";
import { resolveSessionUser } from "../auth/session";
import { Errors } from "../http/errors";
import type { User, Tenant } from "@prisma/client";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User & { tenant: Tenant };
      tenantId?: string;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await resolveSessionUser(req);
    if (!user) return next(Errors.unauthorized());
    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch (err) {
    next(err);
  }
}
