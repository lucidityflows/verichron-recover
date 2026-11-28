import { Module, Global } from '@nestjs/common';
import { RequestContextInterceptor } from './request-context.interceptor';

@Global()
@Module({
  providers: [RequestContextInterceptor],
  exports: [RequestContextInterceptor],
})
export class CoreModule {}
