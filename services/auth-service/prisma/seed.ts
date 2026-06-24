import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Start seeding...');

    const adminEmail = 'admin@test.com';
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (existingAdmin) {
        console.log('⚠️  Admin account already exists, skipping...');
        return;
    }

    const passwordHash = await bcrypt.hash('admin123', 12);

    await prisma.user.create({
        data: {
            email: adminEmail,
            password_hash: passwordHash,
            full_name: 'Admin Tele-Eye',
            role: 'ADMIN',
            is_active: true,
            is_email_verified: true,
        },
    });

    console.log('✅ Admin account created: admin@test.com / admin123');
    console.log('🌱 Seeding finished.');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });