import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
          db: {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || ''),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
          },
          env: process.env.NODE_ENV,
        }),
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
