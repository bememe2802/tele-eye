export function createPrismaMock() {
  return {
    $connect: jest.fn(),
    $transaction: jest.fn(),
    appointment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    appointmentPayment: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    doctor: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    doctorAvailability: {
      createMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    doctorCalendarSlots: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    doctorSpecialization: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    drug: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    eyeMedicalRecord: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      create: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    specialization: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    systemTimeSlot: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    verificationToken: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
  };
}

export function wirePrismaTransaction(prismaMock: any, txMock: any = prismaMock) {
  prismaMock.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') {
      return input(txMock);
    }

    if (Array.isArray(input)) {
      return Promise.all(input);
    }

    return input;
  });
}
