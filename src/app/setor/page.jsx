"use client";

import Pagina from "@/components/Pagina";
import View from "@/views/Funcionamento";

export default function Page() {
  return (
    <Pagina protegida permitirSetor>
      <View />
    </Pagina>
  );
}
