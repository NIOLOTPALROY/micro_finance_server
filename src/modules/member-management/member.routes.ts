import type { FastifyInstance } from "fastify";
import { requireRole } from "../auth/auth.middleware";
import { MemberRepository } from "./member.repository";
import {
  createMemberBodySchema,
  memberIdParamsSchema,
  memberListQuerySchema,
  updateMemberBodySchema,
} from "./member.schemas";
import type {
  CreateMemberInput,
  MemberListQuery,
  UpdateMemberInput,
} from "./member.types";

interface MemberIdParams {
  id: string;
}

function isFutureDate(date: string): boolean {
  return date > new Date().toISOString().slice(0, 10);
}

export async function memberRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateMemberInput }>(
    "/members",
    {
      preHandler: requireRole("admin"),
      schema: { body: createMemberBodySchema },
    },
    async (req, reply) => {
      if (isFutureDate(req.body.date_of_birth)) {
        return reply
          .status(400)
          .send({ error: "Date of birth cannot be in the future" });
      }

      const actorId = req.session.userId;
      if (!actorId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const member = await MemberRepository.create(req.body, actorId);
      return reply.status(201).send({ member });
    }
  );

  app.get<{ Querystring: MemberListQuery }>(
    "/members",
    {
      preHandler: requireRole("admin"),
      schema: { querystring: memberListQuerySchema },
    },
    async (req) => {
      const page = req.query.page ?? 1;
      const limit = req.query.limit ?? 20;
      const { members, total } = await MemberRepository.findPage(page, limit);

      return {
        data: members,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      };
    }
  );

  app.get<{ Params: MemberIdParams }>(
    "/members/:id",
    {
      preHandler: requireRole("admin"),
      schema: { params: memberIdParamsSchema },
    },
    async (req, reply) => {
      const member = await MemberRepository.findById(req.params.id);
      if (!member) {
        return reply.status(404).send({ error: "Member not found" });
      }

      return reply.send({ member });
    }
  );

  app.patch<{ Params: MemberIdParams; Body: UpdateMemberInput }>(
    "/members/:id",
    {
      preHandler: requireRole("admin"),
      schema: {
        params: memberIdParamsSchema,
        body: updateMemberBodySchema,
      },
    },
    async (req, reply) => {
      const dateOfBirth = req.body.date_of_birth;
      if (dateOfBirth && isFutureDate(dateOfBirth)) {
        return reply
          .status(400)
          .send({ error: "Date of birth cannot be in the future" });
      }

      const actorId = req.session.userId;
      if (!actorId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const member = await MemberRepository.update(
        req.params.id,
        req.body,
        actorId
      );
      if (!member) {
        return reply.status(404).send({ error: "Member not found" });
      }

      return reply.send({ member });
    }
  );
}
