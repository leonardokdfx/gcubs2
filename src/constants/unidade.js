// Identificação da unidade de saúde atendida por este sistema.
// Para mudar o nome ou o endereço exibidos no site, altere só aqui.
export const UNIDADE = {
  nome: "UBS 1 Asa Norte",
  endereco: "SGAN 905, Asa Norte",
  cidade: "Brasília – DF",
};

/** "SGAN 905, Asa Norte, Brasília – DF" */
export const ENDERECO_UNIDADE = `${UNIDADE.endereco}, ${UNIDADE.cidade}`;

/** Link para abrir o endereço no mapa do celular. */
export const MAPA_UNIDADE = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${UNIDADE.nome}, ${ENDERECO_UNIDADE}`)}`;
