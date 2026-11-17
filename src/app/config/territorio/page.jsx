"use client";

import Pagina from "@/components/Pagina";
import View from "@/views/Territorio";

export default function Page() {
  return (
    <Pagina protegida apenasSupervisor>
      <View />
    </Pagina>
  );
}
