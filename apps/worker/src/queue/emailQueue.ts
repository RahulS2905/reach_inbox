import { Queue } from "bullmq";
import { QUEUE_NAMES } from "@reachinbox/shared";
import { redisConnection } from "../redis";

export const emailQueue = new Queue(QUEUE_NAMES.emailSend, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 24 * 3600, count: 5000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});
