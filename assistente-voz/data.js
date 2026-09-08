/* ============================================================
   DYON · APP DO CONVIDADO — CONTEÚDO
   Só dados, nenhuma lógica de tela. Cada item traz uma chave
   `icon` que aponta para um símbolo do sprite (#i-<chave>), e
   não um emoji: o desenho é decisão de design, não de conteúdo.

   Aviso: a programação, os horários e os estabelecimentos
   parceiros são ilustrativos, para demonstração do produto.
   Os pontos turísticos e a linha do tempo usam informações
   públicas sobre Santa Rita do Sapucaí e o HackTown.
   ============================================================ */

(() => {
  "use strict";

  const CITY = "Santa Rita do Sapucaí - MG";

  const EVENT = {
    name: "HackTown 2026",
    edition: "10ª edição",
    dateLabel: "03 a 07 de setembro de 2026",
    shortDate: "03 a 07/09",
    venue: "Toda a cidade de Santa Rita do Sapucaí",
    city: CITY,
    region: "Vale da Eletrônica, Sul de Minas Gerais",
    motto: "Você sabe como chega, mas nunca como sai.",
    // Início do credenciamento (Dia 1, 9h) e fim da celebração (Dia 5, 22h).
    startsAt: new Date(2026, 8, 3, 9, 0),
    endsAt: new Date(2026, 8, 7, 22, 0),
    // Janela usada pelo anel da contagem regressiva: 60 dias antes.
    countdownWindowDays: 60,
    mapQuery: "Santa Rita do Sapucaí, MG",
  };

  const EVENT_INFO = [
    { icon: "calendar", label: "Data", value: "03 a 07 de setembro de 2026 (5 dias)" },
    { icon: "clock", label: "Credenciamento", value: "A partir das 9h do Dia 1, nos pontos oficiais." },
    { icon: "location", label: "Local", value: "Toda a cidade de Santa Rita do Sapucaí — MG." },
    { icon: "tourism", label: "Região", value: "Vale da Eletrônica, Sul de Minas Gerais." },
    { icon: "backpack", label: "O que levar", value: "Tênis confortável, protetor solar e disposição — o festival acontece em espaços por toda a cidade." },
    { icon: "info", label: "Bom saber", value: "“Você sabe como chega, mas nunca como sai.” Fique de olho nas notificações para mudanças de última hora." },
  ];

  const SCHEDULE = [
    {
      label: "Dia 1",
      date: "03/09",
      weekday: "quinta",
      items: [
        { time: "09:00", title: "Credenciamento", desc: "Retirada de credencial e kit do participante nos pontos oficiais espalhados pela cidade.", icon: "badge", track: "Geral", place: "Pontos oficiais" },
        { time: "15:00", title: "Abertura oficial", desc: "Cerimônia de abertura da 10ª edição do HackTown.", icon: "mic", track: "Geral", place: "Palco principal" },
        { time: "19:00", title: "Mixer de boas-vindas", desc: "Networking de abertura em bares e espaços parceiros pelo centro da cidade.", icon: "toast", track: "Networking", place: "Centro" },
      ],
    },
    {
      label: "Dia 2",
      date: "04/09",
      weekday: "sexta",
      items: [
        { time: "09:30", title: "Trilha Tecnologia & Inovação", desc: "Palestras e painéis sobre IA, produto e novas tecnologias.", icon: "tech", track: "Tecnologia", place: "Inatel" },
        { time: "14:00", title: "Workshops práticos", desc: "Oficinas em escolas e universidades parceiras do Vale da Eletrônica.", icon: "workshop", track: "Tecnologia", place: "ETE FMC" },
        { time: "20:00", title: "Networking Night", desc: "Encontros informais em bares e restaurantes credenciados.", icon: "night", track: "Networking", place: "Centro" },
      ],
    },
    {
      label: "Dia 3",
      date: "05/09",
      weekday: "sábado",
      items: [
        { time: "10:00", title: "Trilha Negócios & Empreendedorismo", desc: "Painéis com founders, investidores e cases de mercado.", icon: "business", track: "Negócios", place: "Teatro Municipal" },
        { time: "15:30", title: "Pitches de startups", desc: "Apresentações de startups selecionadas para investidores e público.", icon: "pitch", track: "Negócios", place: "Palco principal" },
        { time: "19:30", title: "Happy hour dos parceiros", desc: "Confraternização em espaços comerciais parceiros pela cidade.", icon: "drinks", track: "Networking", place: "Centro" },
      ],
    },
    {
      label: "Dia 4",
      date: "06/09",
      weekday: "domingo",
      items: [
        { time: "10:00", title: "Trilha Criatividade & Cultura", desc: "Conteúdos sobre economia criativa, arte e comunicação.", icon: "art", track: "Criatividade", place: "Praça central" },
        { time: "16:00", title: "Intervenções culturais pela cidade", desc: "Shows, arte urbana e experiências espalhadas por praças e ruas.", icon: "stage", track: "Cultura", place: "Vários pontos" },
        { time: "21:00", title: "Festival Night", desc: "Apresentações musicais em palcos pela cidade.", icon: "music", track: "Cultura", place: "Palcos da cidade" },
      ],
    },
    {
      label: "Dia 5",
      date: "07/09",
      weekday: "segunda",
      items: [
        { time: "10:00", title: "Trilha Bem-estar & Consciência", desc: "Conteúdos sobre saúde mental, propósito e futuro do trabalho.", icon: "wellness", track: "Bem-estar", place: "Parque Ilha dos Amores" },
        { time: "14:00", title: "Painel de encerramento", desc: "Reflexões finais com convidados sobre os aprendizados da semana.", icon: "mic", track: "Geral", place: "Palco principal" },
        { time: "18:00", title: "Encerramento", desc: "Celebração final da 10ª edição do HackTown.", icon: "closing", track: "Geral", place: "Palco principal" },
      ],
    },
  ];

  const PREFERENCES = [
    { id: "trilha", icon: "track", title: "Trilha de interesse", options: ["Tecnologia", "Negócios", "Criatividade", "Cultura & Consciência", "Bem-estar"], selected: 0 },
    { id: "alimentacao", icon: "food", title: "Preferência alimentar", options: ["Sem restrição", "Vegetariano", "Vegano", "Sem glúten", "Sem lactose"], selected: 0 },
    { id: "acessibilidade", icon: "a11y-wheelchair", title: "Necessidades de acessibilidade", options: ["Nenhuma", "Cadeira de rodas", "Acompanhante", "Intérprete de Libras"], selected: 0 },
    { id: "hospedagem", icon: "lodging", title: "Hospedagem", options: ["Já reservei", "Preciso de indicação", "Sou da cidade"], selected: 1 },
    { id: "notificacoes", icon: "bell", title: "Notificações", options: ["Todas as novidades", "Só programação principal", "Mínimas"], selected: 0 },
  ];

  const CATEGORIES = [
    { id: "todos", label: "Todos", icon: "experience" },
    { id: "cafe", label: "Cafés", icon: "coffee" },
    { id: "restaurante", label: "Restaurantes", icon: "food" },
    { id: "hotel", label: "Hospedagem", icon: "lodging" },
    { id: "turismo", label: "Pontos turísticos", icon: "landmark" },
    { id: "cultura", label: "Cultura", icon: "culture" },
    { id: "compras", label: "Compras", icon: "shopping" },
  ];

  /** Arte por categoria — o "retrato" do lugar sem carregar imagem. */
  const CATEGORY_ART = {
    cafe: { grad: "linear-gradient(135deg,#B08968,#6F4E37)", icon: "coffee" },
    restaurante: { grad: "linear-gradient(135deg,#D97757,#8F3D28)", icon: "food" },
    hotel: { grad: "linear-gradient(135deg,#6D28D9,#2E0F52)", icon: "lodging" },
    turismo: { grad: "linear-gradient(135deg,#7C3AED,#A78BFA)", icon: "landmark" },
    cultura: { grad: "linear-gradient(135deg,#C9A876,#7A5F32)", icon: "culture" },
    compras: { grad: "linear-gradient(135deg,#9B8AC4,#4A3C74)", icon: "shopping" },
  };

  const PLACES = [
    { id: "serra-branca", cat: "hotel", name: "Hotel Serra Branca", dist: "1,2 km do centro", rating: "4.8", price: "$$", desc: "Hospedagem parceira do festival, com fácil acesso aos espaços do HackTown.", tags: ["Parceiro oficial", "Café da manhã"] },
    { id: "vale-do-rio", cat: "hotel", name: "Pousada Vale do Rio", dist: "2,4 km do centro", rating: "4.6", price: "$$", desc: "Charme rústico-chique, ótima opção para quem busca mais tranquilidade.", tags: ["Silencioso"] },
    { id: "sabor-mineiro", cat: "restaurante", name: "Fazenda Sabor Mineiro", dist: "900 m do centro", rating: "4.9", price: "$$", desc: "Culinária mineira contemporânea, um dos pontos de encontro do festival.", tags: ["Opções veganas", "Aceita reserva"] },
    { id: "villa-toscana", cat: "restaurante", name: "Trattoria Villa Toscana", dist: "1,8 km do centro", rating: "4.7", price: "$$$", desc: "Massas artesanais e ambiente tranquilo para fugir da multidão.", tags: ["Sem glúten"] },
    { id: "cafe-antenas", cat: "cafe", name: "Café das Antenas", dist: "600 m do centro", rating: "4.7", price: "$", desc: "Torra própria e ambiente aconchegante, ótimo antes da programação do dia.", tags: ["Wi-Fi", "Abre às 7h"] },
    { id: "emporio-vale-verde", cat: "cafe", name: "Empório Vale Verde", dist: "1,1 km do centro", rating: "4.5", price: "$", desc: "Cafés especiais e doces artesanais do Vale do Sapucaí.", tags: ["Produtos locais"] },
    { id: "museu-radio", cat: "turismo", name: "Museu do Rádio e do Eletrônico", dist: "2,0 km do centro", rating: "4.8", price: "$", desc: "História do Vale da Eletrônica, o berço tecnológico da cidade.", tags: ["Acessível"] },
    { id: "mirante-serra", cat: "turismo", name: "Mirante da Serra", dist: "3,5 km do centro", rating: "4.9", price: "Grátis", desc: "Vista panorâmica da cidade, ideal para o pôr do sol entre um painel e outro.", tags: ["Pôr do sol"] },
    { id: "teatro-municipal", cat: "cultura", name: "Teatro Municipal", dist: "1,5 km do centro", rating: "4.6", price: "Grátis", desc: "Um dos palcos oficiais de conteúdos culturais do festival.", tags: ["Palco do festival", "Acessível"] },
    { id: "mercado-central", cat: "compras", name: "Mercado Central", dist: "1,3 km do centro", rating: "4.4", price: "$", desc: "Artesanato local, café e produtos típicos da região.", tags: ["Artesanato"] },
  ];

  const NOTIFICATIONS = [
    { id: "n1", icon: "clock", title: "O HackTown está chegando!", desc: "Faltam poucos dias para a 10ª edição tomar conta de Santa Rita do Sapucaí.", time: "Há 2 horas", go: "evento" },
    { id: "n2", icon: "checklist", title: "Programação atualizada", desc: "Confira os horários mais recentes da trilha Tecnologia & Inovação.", time: "Ontem", go: "programacao" },
    { id: "n3", icon: "badge", title: "Credenciamento liberado", desc: "Você já pode retirar sua credencial nos pontos oficiais a partir das 9h.", time: "Ontem", go: "convite" },
    { id: "n4", icon: "location", title: "Explore Santa Rita do Sapucaí", desc: "Confira restaurantes, cafés e hospedagens parceiras pela cidade.", time: "2 dias atrás", go: "explorar" },
    { id: "n5", icon: "ticket", title: "Credencial digital disponível", desc: "Seu passaporte digital com QR Code já está pronto em Meu convite.", time: "3 dias atrás", go: "convite" },
  ];

  const GALLERY = [
    { grad: "linear-gradient(135deg,#6D28D9,#A78BFA)", caption: "Abertura da edição de 2025", year: "2025" },
    { grad: "linear-gradient(135deg,#C9A876,#7A5F32)", caption: "Palco na praça central", year: "2025" },
    { grad: "linear-gradient(135deg,#D97757,#8F3D28)", caption: "Mixer de boas-vindas", year: "2024" },
    { grad: "linear-gradient(135deg,#2E0F52,#7C3AED)", caption: "Pitches de startups", year: "2024" },
    { grad: "linear-gradient(135deg,#9B8AC4,#4A3C74)", caption: "Workshops no Inatel", year: "2023" },
    { grad: "linear-gradient(135deg,#7C3AED,#2E0F52)", caption: "Encerramento ao pôr do sol", year: "2023" },
  ];

  const MAP_POINTS = [
    { name: "Centro de Credenciamento", icon: "badge", venue: true, top: 48, left: 50, desc: "Ponto principal de credenciamento e informações do festival.", query: `Centro, ${CITY}` },
    { name: "Hotel Serra Branca", icon: "lodging", top: 22, left: 30, desc: "Hospedagem parceira a 1,2 km do centro.", query: `Hotéis em ${CITY}` },
    { name: "Fazenda Sabor Mineiro", icon: "food", top: 34, left: 70, desc: "Restaurante a 900 m, ponto de encontro do festival.", query: `Restaurantes em ${CITY}` },
    { name: "Café das Antenas", icon: "coffee", top: 66, left: 28, desc: "Café especial a 600 m do centro.", query: `Cafés em ${CITY}` },
    { name: "Mirante da Serra", icon: "mountain", top: 78, left: 66, desc: "Ponto turístico com vista panorâmica, 3,5 km do centro.", query: `Mirante, ${CITY}` },
  ];

  const TRANSPORT = [
    { id: "carro", icon: "transport", title: "Carro particular", desc: "Estacionamentos credenciados pela cidade durante o festival.", action: "Abrir rota", kind: "maps" },
    { id: "app", icon: "taxi", title: "Transporte por aplicativo", desc: "Disponível na cidade, com maior demanda nos horários de pico do festival.", action: "Chamar corrida", kind: "uber" },
    { id: "onibus", icon: "bus", title: "Transporte público", desc: "Linhas locais circulando entre os principais polos do festival.", action: "Ver linhas", kind: "transit" },
    { id: "transfer", icon: "shuttle", title: "Transfer oficial", desc: "Saídas de hotéis parceiros durante os 5 dias de evento.", action: "Reservar vaga", kind: "shuttle" },
  ];

  /* Fonte: informações públicas sobre a criação do HackTown (2016) e a
     história do Vale da Eletrônica em Santa Rita do Sapucaí. */
  const HISTORY = [
    { year: "1959", title: "Nasce o Vale da Eletrônica", desc: "Luzia Rennó Moreira, a Sinhá Moreira, funda a Escola Técnica de Eletrônica (ETE) — a primeira escola técnica de eletrônica da América Latina — e muda o destino de Santa Rita do Sapucaí.", icon: "school" },
    { year: "1965", title: "Chega o Inatel", desc: "É fundado o Instituto Nacional de Telecomunicações, referência nacional em ensino e pesquisa de telecomunicações até hoje.", icon: "antenna" },
    { year: "1980", title: "Nome oficial: Vale da Eletrônica", desc: "A prefeitura consolida a marca “Vale da Eletrônica”, reconhecendo a cidade como polo tecnológico do Brasil.", icon: "label" },
    { year: "2016", title: "Nasce o HackTown", desc: "Três amigos criam o festival com expectativa de 50 pessoas em três bares da cidade. Apareceram 600. Ainda em 2016, uma segunda edição aconteceu em setembro.", icon: "closing" },
    { year: "2020–2021", title: "Pausa pela pandemia", desc: "O festival não acontece durante os anos mais críticos da pandemia de Covid-19.", icon: "pause" },
    { year: "2022", title: "Retomada", desc: "O HackTown volta com força total, reafirmando o espírito de reunir tecnologia, criatividade e cultura pela cidade.", icon: "resume" },
    { year: "2023–2025", title: "Consolidação nacional", desc: "O festival passa a atrair mais de 30 mil participantes por edição, sendo comparado ao SXSW americano e injetando dezenas de milhões de reais na economia local.", icon: "growth" },
    { year: "2026", title: "10ª edição", desc: "O HackTown celebra 10 anos de história, com cinco dias de programação por toda Santa Rita do Sapucaí.", icon: "anniversary" },
  ];

  /* Nota: horários, endereços e valores podem mudar — confirme antes de
     visitar (fonte: site oficial de turismo e Museu Delfim Moreira). */
  const ATTRACTIONS = [
    {
      id: "santuario",
      name: "Santuário de Santa Rita de Cássia",
      icon: "church",
      grad: "linear-gradient(135deg,#C9A876,#6D28D9)",
      desc: "A igreja matriz da cidade, na praça central, guarda uma imagem de Santa Rita de Cássia trazida de Portugal na época da fundação do município. Sua arquitetura rica em detalhes é um dos símbolos históricos da cidade.",
      hours: "Aberta diariamente (horários de missa podem variar)",
      address: `Praça Santa Rita de Cássia — Centro, ${CITY}`,
      price: "Entrada gratuita",
      info: "Consulte horários de missas e visitas guiadas diretamente na paróquia local.",
    },
    {
      id: "ete",
      name: "Escola Técnica de Eletrônica (ETE FMC)",
      icon: "school",
      grad: "linear-gradient(135deg,#6D28D9,#2E0F52)",
      desc: "Fundada em 1959 por Luzia Rennó Moreira, foi a primeira escola técnica de eletrônica da América Latina — o marco que deu origem ao Vale da Eletrônica e, décadas depois, ao próprio HackTown.",
      hours: "Visitas mediante agendamento, em dias úteis",
      address: `Av. Sinhá Moreira, 350 — Centro, ${CITY}`,
      price: "Gratuito (agendamento necessário)",
      info: "Agendamento pelo telefone (35) 3473-3600.",
      phone: "+553534733600",
    },
    {
      id: "inatel",
      name: "Inatel",
      icon: "antenna",
      grad: "linear-gradient(135deg,#7C3AED,#A78BFA)",
      desc: "O Instituto Nacional de Telecomunicações, fundado em 1965, é referência nacional em ensino e pesquisa de telecomunicações, formando gerações de engenheiros que sustentam o ecossistema tecnológico da cidade.",
      hours: "Visitas mediante agendamento, em dias úteis",
      address: `Av. João de Camargo, 510 — Centro, ${CITY}`,
      price: "Gratuito (agendamento necessário)",
      info: "Consulte o site oficial do Inatel para agendar uma visita ao campus.",
    },
    {
      id: "museu",
      name: "Museu Histórico Municipal Dr. Delfim Moreira",
      icon: "museum",
      grad: "linear-gradient(135deg,#C9A876,#7A5F32)",
      desc: "Instalado na antiga residência do ex-presidente Delfim Moreira, reúne acervo sobre a formação de Santa Rita do Sapucaí, contando a trajetória da cidade desde suas origens até se tornar polo de inovação.",
      hours: "Segunda a sexta, das 8h30 às 16h30 (sábado sob agendamento)",
      address: `Praça Doutor Delfim Moreira, 42 — Centro, ${CITY}`,
      price: "Entrada gratuita, com visita guiada",
      info: "Telefone: (35) 3473-1071.",
      phone: "+553534731071",
    },
    {
      id: "mirante",
      name: "Mirante do Santo Cruzeiro",
      icon: "mountain",
      grad: "linear-gradient(135deg,#7C3AED,#2E0F52)",
      desc: "Ponto alto da região, com vista panorâmica de toda a cidade — um mirante tradicional entre moradores para observar o pôr do sol sobre o Vale do Sapucaí.",
      hours: "Aberto 24 horas",
      address: `Bairro Vila das Fontes, ${CITY}`,
      price: "Gratuito",
      info: "Sem estrutura de apoio no local — leve água e, se possível, vá ainda com luz do dia.",
    },
    {
      id: "parque",
      name: "Parque Municipal Ilha dos Amores",
      icon: "park",
      grad: "linear-gradient(135deg,#9B8AC4,#4A3C74)",
      desc: "Área verde às margens do rio Sapucaí, com trilhas e espaços de convivência — um refúgio de natureza no meio da cidade que também virou casa de eletrônica.",
      hours: "Diariamente, horário aproximado das 7h às 21h",
      address: `Margens do Rio Sapucaí — Centro, ${CITY}`,
      price: "Gratuito",
      info: "Ideal para uma caminhada leve entre um painel e outro do festival.",
    },
    {
      id: "estacao",
      name: "Estação Ferroviária",
      icon: "station",
      grad: "linear-gradient(135deg,#D97757,#8F3D28)",
      desc: "Antiga estação de trem que testemunhou os primeiros ciclos econômicos da cidade, ligados ao café e à agropecuária, antes da chegada da indústria eletrônica.",
      hours: "Visitação externa livre; espaço interno sujeito a eventos",
      address: `Centro, ${CITY}`,
      price: "Gratuito (área externa)",
      info: "Patrimônio histórico ligado à formação econômica da cidade.",
    },
    {
      id: "baldoni",
      name: "Casa Baldoni — Fazenda de Café",
      icon: "coffee",
      grad: "linear-gradient(135deg,#B08968,#6F4E37)",
      desc: "Antiga fazenda de café que remete à vocação agrícola de Santa Rita do Sapucaí antes da chegada da tecnologia — contraste que hoje faz parte da identidade da cidade.",
      hours: "Visitas mediante agendamento prévio",
      address: `Zona rural, ${CITY}`,
      price: "Valores variáveis conforme o passeio — consulte a fazenda",
      info: "Propriedade privada; recomendado confirmar disponibilidade com antecedência.",
    },
  ];

  const AI_SUGGESTIONS = [
    "Quando é o HackTown 2026?",
    "Tem algum hotel próximo?",
    "Qual a programação de hoje?",
    "Tenho restrição alimentar, o que posso comer?",
    "Como faço o credenciamento?",
  ];

  /** Base do assistente: a primeira regra que casar vence. */
  const AI_RULES = [
    {
      match: (q) => /quando|que dia|data|quantos dias|falta/.test(q),
      answer: "O HackTown 2026 acontece de 03 a 07 de setembro, em Santa Rita do Sapucaí — MG. É a 10ª edição, com cinco dias de conteúdo por toda a cidade.",
      go: { id: "evento", label: "Ver detalhes do evento" },
    },
    {
      match: (q) => /restaurante|comer|jantar|almoç/.test(q) && /perto|próx|prox/.test(q),
      answer: "A Fazenda Sabor Mineiro fica a 900 m do centro de credenciamento — culinária mineira contemporânea e um dos points do festival.",
      go: { id: "explorar", label: "Ver restaurantes" },
    },
    {
      match: (q) => /hotel|hospedagem|dorm|durm|pousada|ficar|hospedar|pernoit/.test(q),
      answer: "O Hotel Serra Branca é parceiro oficial e fica a 1,2 km do centro. A Pousada Vale do Rio também é uma boa opção, um pouco mais tranquila.",
      go: { id: "explorar", label: "Ver hospedagens" },
    },
    {
      match: (q) => /valor|preço|preco|custa|pagar|gratuit|gratis|grátis|graça|de graca/.test(q),
      answer: "Os valores e lotes dos ingressos ficam no site oficial do HackTown. Se você já é credenciado, sua entrada está garantida — é só apresentar o QR Code da credencial.",
      go: { id: "convite", label: "Ver minha credencial" },
    },
    {
      match: (q) => /wi-?fi|internet|sinal|tomada|carregador|bateria/.test(q),
      answer: "Os espaços oficiais e boa parte dos cafés parceiros oferecem Wi-Fi. O Café das Antenas é o mais indicado para trabalhar entre uma trilha e outra. Leve um carregador portátil: nos dias de pico as tomadas disputam espaço.",
      go: { id: "explorar", label: "Ver cafés" },
    },
    {
      match: (q) => /cred|kit|crach|qr|ingresso|convite/.test(q),
      answer: "O credenciamento abre às 9h do Dia 1 (03/09), nos pontos oficiais espalhados pela cidade. Sua credencial digital com QR Code já está pronta em Meu convite.",
      go: { id: "convite", label: "Abrir minha credencial" },
    },
    {
      match: (q) => /restri|alimentar|vegan|vegetarian|glúten|gluten|lactose|alergi/.test(q),
      answer: "Vários restaurantes parceiros têm opções vegetarianas, veganas e sem glúten. Registre sua preferência em Minha experiência para receber indicações alinhadas.",
      go: { id: "experiencia", label: "Definir preferência" },
    },
    {
      match: (q) => /programa|hoje|agenda|horário|horario|palestra|workshop|trilha/.test(q),
      answer: "A programação tem 5 dias e trilhas temáticas: Tecnologia, Negócios, Criatividade, Cultura & Consciência e Bem-estar. Veja os horários de cada dia na Programação.",
      go: { id: "programacao", label: "Ver programação" },
    },
    {
      match: (q) => /cheg|como ir|endereç|endere|localiz|onde fica|onde é|onde acontece|transporte|ônibus|onibus|uber|carro|estacion/.test(q),
      answer: "O HackTown acontece por toda Santa Rita do Sapucaí — MG. Dá para ir de carro, aplicativo, ônibus ou pelo transfer oficial, com saídas de hotéis parceiros.",
      go: { id: "transporte", label: "Ver como chegar" },
    },
    {
      match: (q) => /café|cafe|caf$/.test(q),
      answer: "O Café das Antenas fica a 600 m do centro, abre às 7h e é ótimo para começar o dia antes da programação.",
      go: { id: "explorar", label: "Ver cafés" },
    },
    {
      match: (q) => /passe|turismo|conhecer|visitar|ponto turístico|turístic/.test(q),
      answer: "Vale conhecer o Museu Delfim Moreira, o Santuário de Santa Rita de Cássia e o Mirante do Santo Cruzeiro — a cidade tem história bem antes de virar Vale da Eletrônica.",
      go: { id: "turismo", label: "Ver pontos turísticos" },
    },
    {
      match: (q) => /acessib|cadeira de rodas|libras|intérprete|interprete/.test(q),
      answer: "Você pode ajustar fonte, contraste e movimento em Acessibilidade, e registrar necessidades específicas (cadeira de rodas, acompanhante, Libras) em Minha experiência.",
      go: { id: "acessibilidade", label: "Abrir acessibilidade" },
    },
    {
      match: (q) => /história|historia|origem|começou|comecou|quem criou/.test(q),
      answer: "O HackTown nasceu em 2016, quando três amigos esperavam 50 pessoas em três bares — e apareceram 600. A cidade já era polo tecnológico desde 1959, com a fundação da ETE.",
      go: { id: "historia", label: "Ver a linha do tempo" },
    },
  ];

  const AI_FALLBACK =
    "Posso ajudar com datas, programação, credenciamento, hospedagem, restaurantes, transporte, acessibilidade e pontos turísticos. Pode perguntar à vontade.";

  function aiAnswer(question) {
    const q = question.toLowerCase();
    const rule = AI_RULES.find((r) => r.match(q));
    return rule ? { text: rule.answer, go: rule.go } : { text: AI_FALLBACK, go: null };
  }

  // Um único ponto de entrada global: evita dezenas de variáveis soltas no
  // window e funciona sob file://, onde módulos ES são bloqueados por CORS.
  window.DyonData = {
    EVENT, EVENT_INFO, SCHEDULE, PREFERENCES, CATEGORIES, CATEGORY_ART,
    PLACES, NOTIFICATIONS, GALLERY, MAP_POINTS, TRANSPORT, HISTORY,
    ATTRACTIONS, AI_SUGGESTIONS, aiAnswer,
  };
})();
