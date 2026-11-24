import type { FastifyInstance } from "fastify";
import { memberAssessmentRoutes } from "./member-assessment.routes";

export async function registerMemberAssessmentModule(
  app: FastifyInstance,
): Promise<void> {
  await app.register(memberAssessmentRoutes);
}

export { memberAssessmentRoutes } from "./member-assessment.routes";
export {
  MemberAssessmentError,
  MemberAssessmentRepository,
} from "./member-assessment.repository";
export type {
  CreditBureauCheck,
  CreditBureauCheckQuery,
  CreditBureauCheckStatus,
} from "./member-assessment.types";
export type {
  CreditBureauCheckRequest,
  CreditBureauCheckResult,
  CreditBureauProvider,
} from "./credit-bureau-provider";
