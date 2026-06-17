import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', {
    exclude: [
      'booking/appointments/webhook/sepay',
      'api/booking/appointments/webhook/sepay',
    ],
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 8080;

  // CORS
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // 1. Validate Input (DTO)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ các trường không được khai báo trong DTO
      forbidNonWhitelisted: true,
      transform: true, // [Quan trọng]: Kích hoạt tính năng tự động chuyển đổi kiểu dữ liệu
    }),
  );
  // 2. Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Tele-Eye API')
    .setDescription('The Tele-Ophthalmology API description')
    .setVersion('1.0')
    .addBearerAuth() // Để test chức năng login cần Token
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Truy cập tại: http://localhost:8080/api
  console.log(`🚀 ~ bootstrap ~ http://localhost:${port}/api`);
  console.log(`app start at port ${port}`);

  await app.listen(port);
}
bootstrap();
