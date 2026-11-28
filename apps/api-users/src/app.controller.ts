import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './core';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @Public() // Health check should be a public endpoint
  getHealth(): { status: string; service: string } {
    return this.appService.getHealth();
  }
}
