export const MEMBER_GENDERS = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const;

export const MARITAL_STATUSES = [
  "single",
  "married",
  "widowed",
  "divorced",
  "separated",
] as const;

export type MemberGender = (typeof MEMBER_GENDERS)[number];
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export interface MemberPersonalInformation {
  first_name: string;
  last_name: string;
  father_or_husband_name: string;
  date_of_birth: string;
  gender: MemberGender;
  marital_status?: MaritalStatus | null;
  mobile_number: string;
  alternate_mobile_number?: string | null;
  email?: string | null;
  photograph_reference?: string | null;
}

export type CreateMemberInput = MemberPersonalInformation;

export type UpdateMemberInput = Partial<MemberPersonalInformation>;

export interface Member extends MemberPersonalInformation {
  id: string;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface MemberListQuery {
  page?: number;
  limit?: number;
}
