/**
 * Fondo animado: manchas de color en deriva sobre una rejilla tenue.
 *
 * Es puramente decorativo, así que va oculto para lectores de pantalla y con
 * `pointer-events-none` para no interceptar clics. Se anima con transform y
 * opacity — ambas propiedades compuestas por la GPU — para que un portátil
 * modesto proyectando en una pantalla grande no se atragante.
 */
export function FondoAnimado() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <div className="absolute -left-[15%] -top-[20%] h-[65vmax] w-[65vmax] animate-deriva rounded-full bg-[radial-gradient(circle,oklch(0.6_0.28_305/0.5),transparent_65%)] blur-3xl" />
      <div
        className="absolute -right-[15%] top-[5%] h-[55vmax] w-[55vmax] animate-deriva rounded-full bg-[radial-gradient(circle,oklch(0.62_0.22_210/0.42),transparent_65%)] blur-3xl"
        style={{ animationDelay: '-8s' }}
      />
      <div
        className="absolute bottom-[-25%] left-[20%] h-[60vmax] w-[60vmax] animate-deriva rounded-full bg-[radial-gradient(circle,oklch(0.62_0.25_340/0.38),transparent_65%)] blur-3xl"
        style={{ animationDelay: '-16s' }}
      />

      {/* Rejilla sutil: da profundidad y evita que los degradados se vean planos. */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(to right, oklch(1 0 0 / 0.35) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.35) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 90% 65% at 50% 45%, black, transparent)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 65% at 50% 45%, black, transparent)',
        }}
      />

      {/* Oscurece los bordes para que el contenido central destaque. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_95%)]" />
    </div>
  );
}
