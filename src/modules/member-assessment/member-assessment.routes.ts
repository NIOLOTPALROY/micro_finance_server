import type { FastifyInstance } from "fastify";
import { requirePermission } from "../auth/auth.middleware";
import {
  MemberAssessmentError,
  MemberAssessmentRepository,
} from "./member-assessment.repository";
import {
  creditBureauCheckErrorSchema,
  creditBureauCheckListResponseSchema,
  creditBureauCheckQuerySchema,
  memberIdParamsSchema,
} from "./member-assessment.schemas";
import type { CreditBureauCheckQuery } from "./member-assessment.types";

interface MemberIdParams {
  memberId: string;
}

export async function memberAssessmentRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get<{ Params: MemberIdParams; Querystring: CreditBureauCheckQuery }>(
    "/members/:memberId/credit-checks",
    {
      preHandler: requirePermission("member_assessment.credit_check"),
      schema: {
        summary: "List member credit bureau checks",
        description:
          "Lists score-check attempts. Provider responses are not available until a bureau integration is configured.",
        tags: ["Member assessment"],
        params: memberIdParamsSchema,
        querystring: creditBureauCheckQuerySchema,
        response: { 200: creditBureauCheckListResponseSchema },
      },
    },
    async (req, reply) => {
      const checks = await MemberAssessmentRepository.findCreditBureauChecks(
        req.params.memberId,
        req.query.limit ?? 20,
      );
      if (!checks) {
        return reply.status(404).send({ error: "Member not found" });
      }
      return reply.send({ data: checks });
    },
  );

  app.post<{ Params: MemberIdParams }>(
    "/members/:memberId/credit-checks",
    {
      preHandler: requirePermission("member_assessment.credit_check"),
      schema: {
        summary: "Request a member credit bureau check",
        description:
          "Requires recorded credit bureau consent. The provider API has not been configured, so this records an unavailable attempt and does not request or return a score.",
        tags: ["Member assessment"],
        params: memberIdParamsSchema,
        response: {
          503: creditBureauCheckErrorSchema,
          404: creditBureauCheckErrorSchema,
          409: creditBureauCheckErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const actorId = req.session.userId;
      if (!actorId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      try {
        const check =
          await MemberAssessmentRepository.createUnconfiguredCreditBureauCheck(
            req.params.memberId,
            actorId,
          );
        return reply.status(503).send({
          error:
            "Credit bureau provider is not configured; no score was requested",
          check,
        });
      } catch (error) {
        if (error instanceof MemberAssessmentError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}
