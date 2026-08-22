export default function StoreLayout({ children }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <a href="/" className="font-semibold text-lg">
            Burger House
          </a>
          <nav className="flex items-center gap-4">
            <a href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Iniciar Sesión
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Burger House. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
