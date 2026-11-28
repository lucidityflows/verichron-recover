// src/analytics/analytics.events.controller.ts
import { Controller, Logger } from '@nestjs/common';

@Controller()
export class AnalyticsEventsController {
  private readonly logger = new Logger(AnalyticsEventsController.name);

  constructor() {}
}