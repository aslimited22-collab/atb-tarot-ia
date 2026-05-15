import { PrivacidadeClient } from "./client";

export const metadata = {
  title: "Minha Privacidade — ATB",
  description: "Exercite seus direitos LGPD: baixar seus dados ou excluir conta.",
};

export default function DashboardPrivacidadePage() {
  return <PrivacidadeClient />;
}
