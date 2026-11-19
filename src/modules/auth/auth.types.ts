export interface LoginBody {
  email: string;
  password: string;
}

export type UserRole = "admin" | "member" | "lender";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
