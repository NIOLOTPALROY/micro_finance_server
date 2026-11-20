import type { FastifyInstance } from "fastify";
import { requirePermission } from "../auth/auth.middleware";
import {
  closeMemberFileStorage,
  createMemberFileDownload,
  createMemberFileUpload,
  validateMemberFileReferences,
} from "./member-file-storage";
import { MemberRepository } from "./member.repository";
import {
  createMemberBodySchema,
  memberFileDownloadQuerySchema,
  memberFileDownloadResponseSchema,
  memberFileUploadBodySchema,
  memberFileUploadResponseSchema,
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

interface MemberFileUploadBody {
  category: "image" | "document";
  content_type: string;
  content_length: number;
}

interface MemberFileDownloadQuery {
  key: string;
}

function isFutureDate(date: string): boolean {
  return date > new Date().toISOString().slice(0, 10);
}

function hasFutureBirthDate(
  input: CreateMemberInput | UpdateMemberInput,
): boolean {
  return Boolean(
    (input.date_of_birth && isFutureDate(input.date_of_birth)) ||
    (input.nominee_date_of_birth && isFutureDate(input.nominee_date_of_birth)),
  );
}

export async function memberRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onClose", async () => {
    closeMemberFileStorage();
  });

  app.post<{ Body: MemberFileUploadBody }>(
    "/members/files/upload",
    {
      preHandler: requirePermission("member_files.upload"),
      schema: {
        summary: "Request a member file upload",
        description:
          "Creates a short-lived upload form for a member photograph or document.",
        tags: ["Member management"],
        body: memberFileUploadBodySchema,
        response: { 200: memberFileUploadResponseSchema },
      },
    },
    async (req, reply) => {
      const upload = await createMemberFileUpload(req.body);
      return reply.send(upload);
    },
  );

  app.get<{ Params: MemberIdParams; Querystring: MemberFileDownloadQuery }>(
    "/members/:id/files/download",
    {
      preHandler: requirePermission("member_files.download"),
      schema: {
        summary: "Request a member file download",
        description:
          "Creates a short-lived download URL for a file already referenced by the member.",
        tags: ["Member management"],
        params: memberIdParamsSchema,
        querystring: memberFileDownloadQuerySchema,
        response: { 200: memberFileDownloadResponseSchema },
      },
    },
    async (req, reply) => {
      const member = await MemberRepository.findById(req.params.id);
      if (!member) {
        return reply.status(404).send({ error: "Member not found" });
      }

      const key = req.query.key;
      const isReferenced =
        member.photograph_reference === key ||
        member.bank_document_reference === key ||
        member.kyc_document_references?.includes(key);
      if (!isReferenced) {
        return reply.status(404).send({ error: "Member file not found" });
      }

      return reply.send(await createMemberFileDownload(key));
    },
  );

  app.post<{ Body: CreateMemberInput }>(
    "/members",
    {
      preHandler: requirePermission("members.create"),
      schema: {
        summary: "Register a member",
        description:
          "Creates a member account and stores each registration section separately.",
        tags: ["Member management"],
        body: createMemberBodySchema,
      },
    },
    async (req, reply) => {
      if (hasFutureBirthDate(req.body)) {
        return reply
          .status(400)
          .send({ error: "Birth dates cannot be in the future" });
      }

      const actorId = req.session.userId;
      if (!actorId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      await validateMemberFileReferences(req.body);

      const member = await MemberRepository.create(req.body, actorId);
      return reply.status(201).send({ member });
    },
  );

  app.get<{ Querystring: MemberListQuery }>(
    "/members",
    {
      preHandler: requirePermission("members.read"),
      schema: {
        summary: "List members",
        tags: ["Member management"],
        querystring: memberListQuerySchema,
      },
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
    },
  );

  app.get<{ Params: MemberIdParams }>(
    "/members/:id",
    {
      preHandler: requirePermission("members.read"),
      schema: {
        summary: "Get a member",
        tags: ["Member management"],
        params: memberIdParamsSchema,
      },
    },
    async (req, reply) => {
      const member = await MemberRepository.findById(req.params.id);
      if (!member) {
        return reply.status(404).send({ error: "Member not found" });
      }

      return reply.send({ member });
    },
  );

  app.delete<{ Params: MemberIdParams }>(
    "/members/:id",
    {
      preHandler: requirePermission("members.deactivate"),
      schema: {
        summary: "Deactivate a member",
        description:
          "Soft-deactivates the member, prevents future logins, and marks registration and member status inactive. Personal and registration records are retained.",
        tags: ["Member management"],
        params: memberIdParamsSchema,
        response: {
          204: {
            type: "null",
            description:
              "Member deactivated. All personal and registration records are retained.",
          },
          404: {
            type: "object",
            description: "No registered member was found for this ID.",
            required: ["error"],
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (req, reply) => {
      const actorId = req.session.userId;
      if (!actorId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const deactivated = await MemberRepository.deactivate(
        req.params.id,
        actorId,
      );
      if (!deactivated) {
        return reply.status(404).send({ error: "Member not found" });
      }

      return reply.status(204).send();
    },
  );

  app.patch<{ Params: MemberIdParams; Body: UpdateMemberInput }>(
    "/members/:id",
    {
      preHandler: requirePermission("members.update"),
      schema: {
        summary: "Update a member",
        description:
          "Updates the supplied fields across their corresponding member registration sections.",
        tags: ["Member management"],
        params: memberIdParamsSchema,
        body: updateMemberBodySchema,
      },
    },
    async (req, reply) => {
      if (hasFutureBirthDate(req.body)) {
        return reply
          .status(400)
          .send({ error: "Birth dates cannot be in the future" });
      }

      const actorId = req.session.userId;
      if (!actorId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      await validateMemberFileReferences(req.body);

      const member = await MemberRepository.update(
        req.params.id,
        req.body,
        actorId,
      );
      if (!member) {
        return reply.status(404).send({ error: "Member not found" });
      }

      return reply.send({ member });
    },
  );
}
