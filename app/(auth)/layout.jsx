export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-orange-900/20 via-[#0a0a0a] to-[#0a0a0a] p-4 md:p-10 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="absolute top-[60%] right-[10%] w-[40%] h-[60%] rounded-full bg-amber-600/10 blur-[150px]" />
      </div>
      
      <div className="w-full max-w-sm md:max-w-5xl relative z-10">
        {children}
      </div>
    </div>
  );
}
