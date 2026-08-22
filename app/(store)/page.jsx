export default function StoreHomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-4xl font-bold">Burger House</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Las mejores hamburguras de la ciudad. Pide ya en línea.
        </p>
        <div className="flex gap-4">
          <a
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ver Menú
          </a>
        </div>
      </div>
    </div>
  );
}
