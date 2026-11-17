import 'dotenv/config';
import { db } from './database';
import { createHash } from 'crypto';

interface AdminUser {
    name: string;
    email: string;
    password: string;
}

const ADMIN_USERS: AdminUser[] = [
    {
        name: 'Admin One',
        email: 'admin1@microfinance.local',
        password: 'admin123456',
    },
    {
        name: 'Admin Two',
        email: 'admin2@microfinance.local',
        password: 'admin123456',
    },
    {
        name: 'Admin Three',
        email: 'admin3@microfinance.local',
        password: 'admin123456',
    },
    {
        name: 'Admin Four',
        email: 'admin4@microfinance.local',
        password: 'admin123456',
    },
];

async function seed() {
    try {
        console.log('🌱 Seeding database with admin users...');

        // Clear existing users
        await db.deleteFrom('users').execute();

        // Insert admin users
        for (const admin of ADMIN_USERS) {
            const passwordHash = createHash('sha256')
                .update(admin.password)
                .digest('hex');

            const user = await db
                .insertInto('users')
                .values({
                    email: admin.email,
                    name: admin.name,
                    password_hash: passwordHash,
                    role: 'admin',
                })
                .returningAll()
                .executeTakeFirst();

            if (user) {
                console.log(`✅ Created admin: ${admin.email}`);
            }
        }

        console.log('\n✅ Seeding completed successfully!\n');
        console.log('📝 Default Admin Credentials:');
        ADMIN_USERS.forEach((admin) => {
            console.log(`   Email: ${admin.email}`);
            console.log(`   Password: ${admin.password}\n`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
