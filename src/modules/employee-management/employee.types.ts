export const EMPLOYEE_PERMISSIONS = [
  "members.read",
  "members.create",
  "members.update",
  "members.deactivate",
  "member_files.upload",
  "member_files.download",
  "member_assessment.credit_check",
] as const;

export type EmployeePermission = (typeof EMPLOYEE_PERMISSIONS)[number];
export type EmployeeStatus = "active" | "inactive";

export interface CreateEmployeeInput {
  name: string;
  email: string;
  password: string;
  permissions: EmployeePermission[];
}

export interface UpdateEmployeeInput {
  name?: string;
  password?: string;
  status?: EmployeeStatus;
  permissions?: EmployeePermission[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  status: EmployeeStatus;
  permissions: EmployeePermission[];
  created_at: Date;
  updated_at: Date;
}
