import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { env } from './config/env.config';

function isAllowedDesktopOrigin(origin: string) {
  if (origin === 'null' || origin.startsWith('file://')) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || env.corsOrigin === '*' || origin === env.corsOrigin || isAllowedDesktopOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origen no permitido: ${origin}`));
      },
    },
  });

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (env.enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Point of Sale API')
      .setDescription('Backend base para Point of Sale')
      .setVersion('1.0.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, { swaggerOptions: { docExpansion: 'none' } });
  }

  await app.listen(env.port, env.host);
}

bootstrap();
