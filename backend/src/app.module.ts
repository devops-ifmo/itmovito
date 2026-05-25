import { Module } from '@nestjs/common';
import { ItemModule } from './services/items/items.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [MetricsModule, ItemModule],
})
export class AppModule {}
