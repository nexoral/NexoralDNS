import { Controller } from '@nestjs/common';

@Controller('dns')
export default class DnsController {
  addDNS() {
    return 'DNS added';
  }
}
