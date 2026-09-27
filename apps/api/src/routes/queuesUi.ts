import { Router } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { requireAuth } from "../middleware/requireAuth";
import { emailQueue } from "../queue/emailQueue";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  // Type-only mismatch between the currently published @bull-board/api and
  // bullmq's `Job.progress` type (string|number|object vs number|object) —
  // functionally compatible at runtime; the array is cast past it below.
  queues: [new BullMQAdapter(emailQueue)] as unknown as Parameters<typeof createBullBoard>[0]["queues"],
  serverAdapter,
});

export const queuesUiRouter = Router();
// Bull Board exposes full queue contents (recipients, subjects, errors), so
// it sits behind the same session auth as the rest of the API — never
// exposed publicly, per the assignment's requirement.
queuesUiRouter.use(requireAuth, serverAdapter.getRouter());
