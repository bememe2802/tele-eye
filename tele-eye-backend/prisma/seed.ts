import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // ====================================================
  // 1. TẠO CHUYÊN KHOA
  // ====================================================
  const specializations = [
    {
      name: 'Khám mắt tổng quát',
      description: 'Kiểm tra thị lực và các bệnh lý chung',
    },
    {
      name: 'Giác mạc & Bề mặt nhãn cầu',
      description: 'Điều trị viêm loét giác mạc, khô mắt',
    },
    {
      name: 'Thể thủy tinh (Cataract)',
      description: 'Phẫu thuật đục thủy tinh thể',
    },
    { name: 'Glocom (Thiên đầu thống)', description: 'Điều trị tăng nhãn áp' },
    {
      name: 'Dịch kính - Võng mạc',
      description: 'Bệnh lý đáy mắt, tiểu đường biến chứng mắt',
    },
    { name: 'Khúc xạ & Lasik', description: 'Điều trị cận, viễn, loạn thị' },
    {
      name: 'Mắt trẻ em (Nhi nhãn)',
      description: 'Các bệnh lý mắt bẩm sinh, lác/lé',
    },
    { name: 'Thẩm mỹ mắt', description: 'Phẫu thuật tạo hình mi, hốc mắt' },
  ];

  for (const spec of specializations) {
    await prisma.specialization.upsert({
      where: { name: spec.name },
      update: {},
      create: {
        name: spec.name,
        description: spec.description,
      },
    });
  }
  console.log(`✅ Seeded specializations.`);

  // ====================================================
  // 2. TẠO ADMIN
  // ====================================================
  const adminEmail = 'admin@test.com';
  const adminPassword = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);
  console.log('🔐 Seeding Admin user...', hashedPassword);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password_hash: hashedPassword,
      role: 'ADMIN',
      is_active: true,
      is_email_verified: true,
    },
  });

  console.log(`✅ Created Admin user: ${adminEmail}`);

  // ====================================================
  // 3. TẠO SYSTEM TIME SLOTS (SỬA LỖI DATETIME)
  // ====================================================
  console.log('⏳ Generating Time Slots...');

  const slots: any[] = [];

  const START_HOUR = 7;
  const END_HOUR = 21;
  const INTERVAL = 30;

  let currentHour = START_HOUR;
  let currentMinute = 0;

  // Lấy ngày hiện tại làm mốc để tạo Date object hợp lệ
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0); // Reset giờ về 0 để tính toán cho chuẩn

  while (currentHour < END_HOUR) {
    // 1. Tạo Date Object cho giờ bắt đầu (Fix lỗi Invalid ISO-8601)
    const startDate = new Date(baseDate);
    startDate.setHours(currentHour, currentMinute, 0, 0);

    // 2. Tạo Date Object cho giờ kết thúc
    const endDate = new Date(startDate);
    endDate.setMinutes(startDate.getMinutes() + INTERVAL);

    // 3. Tạo chuỗi hiển thị (Shift Name)
    // Helper function để thêm số 0 đằng trước: 7 -> "07"
    const formatTime = (date: Date) =>
      `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    const shiftName = `${formatTime(startDate)} - ${formatTime(endDate)}`;

    slots.push({
      shift_name: shiftName,
      start_time: startDate, // QUAN TRỌNG: Truyền Date object, không truyền string "07:00"
      end_time: endDate, // QUAN TRỌNG: Truyền Date object
      is_active: true,
    });

    // Cập nhật biến lặp dựa trên endDate vừa tính được
    currentHour = endDate.getHours();
    currentMinute = endDate.getMinutes();
  }

  // Dùng createMany với skipDuplicates
  const createdSlots = await prisma.systemTimeSlot.createMany({
    data: slots,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded Time Slots. Added ${createdSlots.count} new slots.`);

  // ====================================================
  // 4. TẠO DANH MỤC THUỐC (DRUGS)
  // ====================================================
  console.log('💊 Seeding Drugs...');
  const eyeDrugs = [
    {
      name: 'Systane Ultra 5ml',
      active_ingredient: 'Polyethylene Glycol 400, Propylene Glycol',
      unit: 'Lọ',
      usage_instruction:
        'Nhỏ 1-2 giọt/lần vào mắt bị tổn thương khi cần thiết.',
    },
    {
      name: 'Sanlein 0.1% 5ml',
      active_ingredient: 'Sodium Hyaluronate 0.1%',
      unit: 'Lọ',
      usage_instruction: 'Nhỏ 1 giọt/lần, 5-6 lần/ngày.',
    },
    {
      name: 'Refresh Tears 15ml',
      active_ingredient: 'Carboxymethylcellulose sodium 0.5%',
      unit: 'Lọ',
      usage_instruction: 'Nhỏ 1-2 giọt vào mắt bị khô khi cần thiết.',
    },
    {
      name: 'V.Rohto Vitamin 13ml',
      active_ingredient: 'Vitamin B6, Vitamin E, Na Chondroitin',
      unit: 'Lọ',
      usage_instruction: 'Nhỏ 2-3 giọt/lần, 5-6 lần/ngày để giảm mỏi mắt.',
    },
    {
      name: 'Cravit 0.5% 5ml',
      active_ingredient: 'Levofloxacin 0.5%',
      unit: 'Lọ',
      usage_instruction:
        'Ngày 1-2: 1-2 giọt/lần mỗi 2 giờ. Ngày 3-7: 1-2 giọt/lần mỗi 4 giờ.',
    },
    {
      name: 'Tobrex 5ml',
      active_ingredient: 'Tobramycin 0.3%',
      unit: 'Lọ',
      usage_instruction: 'Nhỏ 1-2 giọt vào mắt bị viêm mỗi 4 giờ.',
    },
    {
      name: 'Tobradex 5ml',
      active_ingredient: 'Tobramycin 0.3%, Dexamethasone 0.1%',
      unit: 'Lọ',
      usage_instruction:
        'Nhỏ 1-2 giọt vào túi kết mạc mỗi 4-6 giờ. Tránh dùng quá 14 ngày.',
    },
    {
      name: 'Ocuvite Adult 50+',
      active_ingredient: 'Lutein, Zeaxanthin, Omega-3',
      unit: 'Viên',
      usage_instruction: 'Uống 1 viên mỗi ngày vào buổi sáng sau khi ăn.',
    },
    {
      name: 'Wit',
      active_ingredient: 'Broccophane',
      unit: 'Viên',
      usage_instruction: 'Uống 1 viên/ngày, sau bữa ăn.',
    },
  ];

  for (const drug of eyeDrugs) {
    await prisma.drug.upsert({
      where: { name: drug.name },
      update: {},
      create: drug,
    });
  }
  console.log(`✅ Seeded ${eyeDrugs.length} drugs.`);

  console.log('✅ Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
