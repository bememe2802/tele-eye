import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const port = process.env.PORT ? Number(process.env.PORT) : 8084;

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    console.log(`🏥 Medical Service running at http://localhost:${port}`);
    await app.listen(port);
}
bootstrap();