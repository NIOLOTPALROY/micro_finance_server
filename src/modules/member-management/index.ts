import type { FastifyInstance } from "fastify";
import { memberRoutes } from "./member.routes";

export async function registerMemberManagementModule(
  app: FastifyInstance,
): Promise<void> {
  await app.register(memberRoutes);
}

export { memberRoutes } from "./member.routes";
export { MemberRepository } from "./member.repository";
export type {
  BankAccountType,
  CreateMemberInput,
  CreditBureauStatus,
  KycApprovalStatus,
  KycStatus,
  MaritalStatus,
  Member,
  MemberAddressInformation,
  MemberAssignmentInformation,
  MemberBankInformation,
  MemberFamilyFinancialInformation,
  MemberGender,
  MemberInternalApprovalInformation,
  MemberKycInformation,
  MemberNomineeInformation,
  MemberPersonalInformation,
  MemberRegistrationDetails,
  MemberVerificationConsentInformation,
  RegistrationStatus,
  ResidenceType,
  UpdateMemberInput,
  VerificationStatus,
} from "./member.types";
