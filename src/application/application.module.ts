import { Module, Global } from '@nestjs/common';
import { ResponseBuilderService } from './services/response-builder.service';

@Global() 
@Module({
  providers: [
    ResponseBuilderService,
  ],
  exports: [
    ResponseBuilderService,
  ],
})
export class ApplicationModule {}