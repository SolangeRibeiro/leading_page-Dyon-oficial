# Dyon · App do convidado — HackTown 2026

O aplicativo de quem foi convidado. Credencial digital, programação, mapa,
transporte e guia da cidade, no bolso e funcionando mesmo sem sinal.

Faz parte do ecossistema **Dyon**, ao lado da plataforma de quem organiza e do
aplicativo do cliente.

---

## Como abrir

Duplo clique em `index.html`. Funciona direto do `file://`: os ícones são um
sprite SVG embutido, os scripts são clássicos (não módulos ES) e nada é buscado
na rede.

Para servir por HTTP — necessário só para testar o modo offline e a instalação
como aplicativo:

```bash
python -m http.server 5500
```

O app pede o nome do convidado na entrada e personaliza tudo a partir dele: a
credencial, as saudações e as recomendações.

## Telas

| Tela | O que traz |
|---|---|
| **Início** | Contagem regressiva, próximo compromisso e atalhos |
| **Evento** | Informações gerais do HackTown 2026 |
| **Programação** | Grade por dia, com filtros e favoritos |
| **Convite** | Credencial digital com QR Code |
| **Experiência** | Trilhas e recomendações para o convidado |
| **Explorar** | Guia de Santa Rita do Sapucaí |
| **Mapa** | Locais do evento e da cidade |
| **Transporte** | Como chegar e como circular |
| **Momentos** | Registro do que a pessoa viveu no evento |
| **Salvos** | Tudo que foi marcado como favorito |
| **Notificações** | Avisos da organização |
| **Acessibilidade** | Preferências de leitura e movimento |

## A ficha de presença

Confirmar presença deixou de ser um botão que só liga e desliga: abre um
formulário curto, no painel. São seis perguntas, todas de um toque, com campo
de texto só quando a resposta pede:

| Pergunta | Resposta |
|---|---|
| Vai levar acompanhante? | Sozinho(a) ou com acompanhante — aí, quantos |
| Bebe álcool? | Sim ou não |
| O que prefere beber? | **Quantas quiser** entre Cerveja, Drinks, Vinho, Suco, Refrigerante, Água com gás e Água sem gás |
| É vegetariano(a)? | Sim ou não |
| Tem alergia a algum alimento? | Se sim, qual — obrigatório |
| Tem alguma deficiência que precisa de acessibilidade? | Se sim, qual — obrigatório |

Quatro decisões dentro disso:

- **A presença começa não confirmada.** Confirmar é uma escolha da pessoa, e é
  nela que a ficha aparece — se o app já abrisse confirmado, ninguém responderia.
- **A bebida aceita mais de uma escolha.** Quem toma cerveja costuma tomar
  refrigerante também, e a produção precisa das duas informações.
- **Quem diz que não bebe álcool não vê cerveja, drinks nem vinho** na pergunta
  seguinte. A lista se refaz na hora e as opções alcoólicas que já estavam
  marcadas caem — as outras continuam marcadas.
- **Alergia e acessibilidade exigem o texto.** Marcar "tenho alergia" e deixar em
  branco não salva: uma alergia sem o alimento não serve para ninguém. O mesmo
  vale para escolher ao menos uma bebida.
- **A alergia é a única resposta destacada** no resumo, em âmbar. As outras
  orientam a compra; essa orienta a cozinha, e precisa ser vista antes de servir
  o prato.

O resumo fica embaixo da credencial, com um botão para editar. Quem confirmou
presença antes de a ficha existir vê um convite para responder, em vez de
precisar cancelar e confirmar de novo.

As respostas ficam neste aparelho, em `dyon.rsvp.ficha`.

## A rota até o evento

Em **Como chegar → Carro particular → Abrir rota**, o app traça a rota até o
evento. O destino é o **Centro de Credenciamento**, não a cidade inteira: rota
para "Santa Rita do Sapucaí" largaria a pessoa em qualquer ponto do município.

Usa a **Maps URLs API** do Google, que **não pede chave de API**. Foi escolha
técnica, não atalho:

- Quem assume a navegação é o **aplicativo de mapa do celular** — que já tem a
  localização, a voz e o trânsito em tempo real. Sem `origin` na URL, o Google
  parte de onde a pessoa está, e é isso que faz a rota "cair" pronta.
- Uma **chave de API embutida nesta página seria pública**: qualquer pessoa que
  abrisse o código-fonte poderia usá-la, e as chamadas cairiam na conta da Dyon.
  Chave de Maps só com um servidor guardando ela, ou com restrição de domínio —
  nenhum dos dois existe num app estático como este.

O mesmo painel oferece Waze (com `navigate=yes`, que já inicia a navegação) e
Uber. Cada botão tem o verbo do que realmente faz: mapa **traça rota**, Uber
**chama corrida**.

> Se um dia quiser o **mapa embutido dentro do app**, com o traçado desenhado na
> tela em vez de abrir outro aplicativo, aí sim é preciso chave (Maps Embed API
> ou Directions API) e um servidor para guardá-la.

## Decisões que valem explicar

**QR Code gerado no próprio aparelho.** `qr.js` é um codificador completo —
modo byte, correção de erro nível M, versões 1 a 10, Reed-Solomon sobre GF(256),
intercalação de blocos e as oito máscaras avaliadas por penalidade, conforme a
ISO/IEC 18004. Nenhuma biblioteca, nenhuma chamada de rede: a credencial precisa
abrir no credenciamento com o celular offline.

**Funciona offline e instala.** O service worker serve o casco do cache e
atualiza a cópia em segundo plano. Sob `file://` ele nem entra em ação, porque
o app já roda do disco.

**Agenda em `.ics`.** A programação salva vai para o calendário do aparelho no
formato do padrão RFC 5545.

**Acessibilidade.** Navegação por teclado, foco gerenciado a cada troca de tela,
mudanças anunciadas por região `aria-live`, alvos de toque de 44px e
`prefers-reduced-motion` respeitado.

## Estrutura

```
.
├── index.html            Telas e sprite de ícones
├── style.css             Sistema visual, escrito primeiro para o celular
├── data.js               Só conteúdo (evento, programação, locais)
├── script.js             Só comportamento (navegação, telas, ações)
├── qr.js                 Codificador de QR Code
├── sw.js                 Cache offline
├── manifest.webmanifest  Instalação como aplicativo
├── icon.svg              Ícone
└── tools/
    └── build-icons.mjs   Gera o sprite de ícones e injeta no HTML
```

A separação entre `data.js` e `script.js` é proposital: trocar o conteúdo do
evento não deve exigir mexer em lógica de tela.

### Regenerar os ícones

O sprite é gerado a partir do Phosphor Icons e injetado no `index.html` entre os
marcadores `<!--ICON-SPRITE-->`. Precisa do pacote instalado na pasta acima:

```bash
npm install @phosphor-icons/core
```

Depois:

```bash
node tools/build-icons.mjs
```

## Limitações conhecidas

- É um **protótipo de interface**: não há servidor. O conteúdo é de
  demonstração; só o nome do convidado, os favoritos e as preferências ficam no
  aparelho (`localStorage`).
- A credencial não é validada contra nenhuma base — o QR carrega o dado do
  convidado, e a conferência na portaria é o ponto de integração que falta.

## Créditos

Ícones: [Phosphor Icons](https://phosphoricons.com) (MIT).
Tipografia: Sora e Inter, via Google Fonts (OFL).

---

© 2026 Dyon. Todos os direitos reservados.
