import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full border-b border-accent bg-accent px-4 py-1.5 text-center text-xs text-accent-foreground">
      Pagamentos no preview estão em modo de teste.{" "}
      <a href="https://docs.lovable.dev/features/payments#test-and-live-environments" target="_blank" rel="noopener noreferrer" className="font-medium underline">
        Saiba mais
      </a>
    </div>
  );
}
