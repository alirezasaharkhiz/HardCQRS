import { Controller, Get } from '@nestjs/common';
import { HealthResponse, HealthApplication } from 'src/domains/health/applications/health.application';

@Controller()
export class HealthController {
  constructor(private readonly healthApplication: HealthApplication) {
  }

  @Get('/')
  async index(): Promise<object> {
    return {
      message: "megatron is up and running!!!"
    };
  }

  @Get('/health')
  async health(): Promise<HealthResponse> {
    return this.healthApplication.getHealthStatus();
  }

  @Get('/ping')
  ping() {
    return this.healthApplication.getPing();
  }
}
