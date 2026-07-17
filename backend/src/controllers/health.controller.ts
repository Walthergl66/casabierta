import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../common/config/env';
import { GenerationService } from '../services/generation.service';

/** Sonda de salud. Railway y los balanceadores la consultan para el despliegue. */
@Controller('api/health')
export class HealthController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly generations: GenerationService,
  ) {}

  @Get()
  estado(): {
    status: string;
    proveedor: string;
    mejorador: string;
    /** Si es false, el frontend oculta la pestaña de cámara. */
    camaraDisponible: boolean;
    uptime: number;
  } {
    return {
      status: 'ok',
      // Útil para confirmar de un vistazo qué proveedor está activo
      // sin entrar a mirar el entorno del despliegue.
      proveedor: this.config.get('IMAGE_PROVIDER', { infer: true }),
      mejorador: this.config.get('PROMPT_ENHANCER', { infer: true }),
      camaraDisponible: this.generations.edicionDisponible,
      uptime: Math.round(process.uptime()),
    };
  }
}
