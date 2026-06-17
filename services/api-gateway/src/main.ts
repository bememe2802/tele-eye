import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');

    const port = process.env.PORT ? Number(process.env.PORT) : 8080;

    app.enableCors({
        origin: ['http://localhost:3000', 'http://frontend:3000'],
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    const config = new DocumentBuilder()
        .setTitle('Tele-Eye API Gateway')
        .setDescription('API Gateway for Tele-Eye Microservices')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`🚀 API Gateway running at http://localhost:${port}/api`);
    console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);

    await app.listen(port);
}
bootstrap();