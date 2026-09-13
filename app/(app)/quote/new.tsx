import { Placeholder } from '@/components/ui/Placeholder';

// TODO(MVP-2): cliente (buscar/crear) -> ítems dinámicos -> Generar PDF y Enviar.
// Servicios ya listos: src/services/pdf.ts (generateAndUpload) y src/services/whatsapp.ts.
export default function NewQuote() {
  return (
    <Placeholder
      title="Nuevo Presupuesto"
      hint="Creador express: cliente, ítems y 'Generar PDF y Enviar' por WhatsApp."
    />
  );
}
