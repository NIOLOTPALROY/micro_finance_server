import type { FastifyInstance } from "fastify";
import { memberRoutes } from "./member.routes";

export async function registerMemberManagementModule(
  app: FastifyInstance
): Promise<void> {
  await app.register(memberRoutes);
}

export { memberRoutes } from "./member.routes";
export { MemberRepository } from "./member.repository";
export type {
  CreateMemberInput,
  MaritalStatus,
  Member,
  MemberGender,
  MemberPersonalInformation,
  UpdateMemberInput,
} from "./member.types";
