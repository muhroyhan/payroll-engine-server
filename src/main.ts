import { NestFactory, Reflector } from '@nestjs/core'
import { AppModule } from './app/app.module'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import * as qs from 'qs'
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== 'production',
      routerOptions: {
        querystringParser: (str) => qs.parse(str),
      },
    }),
  )
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
      policy:
        process.env.NODE_ENV === 'production' ? 'same-origin' : 'cross-origin',
    },
  })
  await app.register(multipart, {
    limits: {
      fieldNameSize: 200, // Max field name size in bytes
      fieldSize: 2000000, // Max field value size in bytes
      fields: 20, // Max number of non-file fields
      fileSize: 2 * 1024 * 1024, // For multipart forms, the max file size 2MB
      files: 1, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
    },
  })
  app.enableCors({
    exposedHeaders: 'Content-Disposition',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
    }),
  )
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))

  // enable versioning api
  app.enableVersioning({
    type: VersioningType.URI,
  })

  if (process.env.NODE_ENV !== 'production') {
    // swagger docs
    const config = new DocumentBuilder()
      .setTitle('SKT Payroll Server API')
      .setDescription('The Api Server For SKT Payroll System')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('docs', app, document)
  }
  app.enableShutdownHooks()
  await app.listen(process.env.PORT ?? '', '0.0.0.0')
}
bootstrap().catch((err) => {
  throw err
})
