import { Controller, Post } from '@nestjs/common';
@Controller('add-dns')
export class HelloController {
  @Post()
  addDNS() {
    return 'DNS added';
  }
}
