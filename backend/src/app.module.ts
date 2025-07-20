import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { ProductModule } from './infrastructure/web/product.module';
import { TransactionModule } from './infrastructure/web/transaction.module';
import { PaymentModule } from './infrastructure/web/payment.module';
import { ApplicationModule } from './application/application.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ProductModule,
    TransactionModule,
    PaymentModule,
    ApplicationModule
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}