"use client";

import Pagina from "@/components/Pagina";
import View from "@/views/GerenciarEquipes";

export default function Page() {
  return (
    <Pagina protegida apenasSupervisor>
      <View />
    </Pagina>
  );
}
