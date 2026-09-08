export interface PaymentMethod {
  id: string;
  name: string;
  image: string;
  description?: string;
}

export const paymentMethods: PaymentMethod[] = [
  { id: "WAVE", name: "Wave", image: "/images/logo-wave.png", description: "Wave CI" },
  { id: "ORANGE_MONEY", name: "Orange Money", image: "/images/orange.png", description: "Orange Money" },
  { id: "MTN_MOMO", name: "MTN MoMo", image: "/images/MTN.png", description: "MTN Mobile Money" },
  { id: "MOOV", name: "Moov Money", image: "/images/moov.png", description: "Moov Money" },
  { id: "CARTE", name: "Carte bancaire", image: "", description: "Visa/Mastercard" },
  { id: "ESPECES", name: "Paiement en espèces", image: "", description: "" },
];
