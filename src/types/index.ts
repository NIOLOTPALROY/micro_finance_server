export type UserId = string;
export type LoanId = string;
export type TransactionId = string;

export interface User {
    id: UserId;
    email: string;
    name: string;
    password_hash: string;
    role: 'admin' | 'borrower' | 'lender';
    created_at: Date;
    updated_at: Date;
}

export interface Loan {
    id: LoanId;
    borrower_id: UserId;
    amount: number; // in cents
    interest_rate: number; // percentage, e.g. 5.5 for 5.5%
    term_months: number;
    status: 'pending' | 'approved' | 'disbursed' | 'repaid' | 'defaulted' | 'rejected';
    created_at: Date;
    updated_at: Date;
    approved_at?: Date | null;
    disbursed_at?: Date | null;
}

export interface Repayment {
    id: TransactionId;
    loan_id: LoanId;
    amount: number; // in cents
    due_date: Date;
    paid_date?: Date | null;
    status: 'pending' | 'paid' | 'overdue';
    created_at: Date;
}

export interface NewLoanInput {
    borrower_id: UserId;
    amount: number;
    interest_rate: number;
    term_months: number;
}

export interface NewRepaymentInput {
    loan_id: LoanId;
    amount: number;
    due_date: string; // ISO date
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
