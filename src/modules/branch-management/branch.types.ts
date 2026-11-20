export interface CreateBranchInput {
  code: string;
  name: string;
  is_default?: boolean;
}

export interface UpdateBranchInput {
  code?: string;
  name?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
