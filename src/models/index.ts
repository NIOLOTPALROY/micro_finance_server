import { db, type User } from '../db/database';

export class UserModel {
    static async findByEmail(email: string): Promise<User | undefined> {
        return await db
            .selectFrom('users')
            .selectAll()
            .where('email', '=', email)
            .executeTakeFirst();
    }

    static async findById(id: string): Promise<User | undefined> {
        return await db
            .selectFrom('users')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
    }

    static async create(
        email: string,
        name: string,
        passwordHash: string
    ): Promise<User> {
        const result = await db
            .insertInto('users')
            .values({
                email,
                name,
                password_hash: passwordHash,
                role: 'admin',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return result;
    }

    static async findAll(): Promise<User[]> {
        return await db
            .selectFrom('users')
            .selectAll()
            .orderBy('created_at', 'desc')
            .execute();
    }
}
