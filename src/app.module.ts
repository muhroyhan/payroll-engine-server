import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuditLogsModule } from '@src/audit-logs/audit-logs.module'
import { UsersModule } from '@src/users/users.module'

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
    AuditLogsModule,
    UsersModule,
  ],
})
export class AppModule {}
