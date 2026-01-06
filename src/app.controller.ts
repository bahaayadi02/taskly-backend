import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test')
  test() {
    console.log('TEST endpoint called!');
    return {
      success: true,
      message: 'Server is working!',
      timestamp: new Date().toISOString(),
    };
  }
}
