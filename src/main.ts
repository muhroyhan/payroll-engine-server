import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import * as qs from 'qs'

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
  await app.listen(process.env.PORT ?? '')
}
void bootstrap()
