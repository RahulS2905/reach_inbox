import { Client } from "@elastic/elasticsearch";
import { env } from "../env";

export const esClient = new Client({ node: env.ELASTICSEARCH_URL });
export const EMAIL_INDEX = env.ELASTICSEARCH_INDEX;
