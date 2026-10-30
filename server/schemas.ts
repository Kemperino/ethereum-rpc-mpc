import { z } from "zod";

export const rpcParamsSchema = z.array(z.unknown());
