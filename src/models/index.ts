import { pool } from '../db/db';

export interface User {
    id: string;
    email: string;
    name: string;
    password_hash: string;
    role: 'admin' | 'borrower' | 'lender';
    created_at: Date;
    updated_at: Date;
}

export class UserModel {
    static async findByEmail(email: string): Promise<User | undefined> {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] as User | undefined;
    }

    static async findById(id: string): Promise<User | undefined> {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] as User | undefined;
    }

    static async create(
        email: string,
        name: string,
        passwordHash: string
    ): Promise<User> {
        const result = await pool.query(
            'INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [email, name, passwordHash, 'admin']
        );
        return result.rows[0] as User;
    }

    static async findAll(): Promise<User[]> {
        const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
        return result.rows as User[];
    }
}
