import { Module } from '@nestjs/common';
import { DnsModule } from './dns/dns.module';
@Module({
  imports: [DnsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
