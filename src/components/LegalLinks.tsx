import { Link } from "@tanstack/react-router";

export function LegalLinks() {
  return <nav aria-label="Informações legais" className="flex min-w-0 flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
    <Link to="/privacy" className="underline-offset-4 hover:underline">Privacidade</Link>
    <Link to="/terms" className="underline-offset-4 hover:underline">Termos de uso</Link>
    <Link to="/refund" className="underline-offset-4 hover:underline">Reembolso</Link>
    <a href="mailto:miguels.avelin@gmail.com" className="underline-offset-4 hover:underline">Contato</a>
  </nav>;
}