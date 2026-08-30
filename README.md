# Dyon — Landing page

> Seu evento. Sua experiência.

Página institucional da **Dyon**, um ecossistema que reúne organização,
clientes, convidados e destino numa só experiência de evento — hoje espalhada
por dezenas de ferramentas diferentes.

🔗 **No ar em [dyonoficial.com.br](https://dyonoficial.com.br)**

---

## O que tem na página

| Seção | Conteúdo |
|---|---|
| `#inicio` | Abertura com a proposta e chamada para o banco de espera |
| `#problema` | Por que planejar um evento hoje é fragmentado |
| `#solucoes` | O ecossistema, parte por parte |
| `#experiencia` | O papel do convidado dentro do evento |
| `#turismo` | O evento além do local da festa — hospedagem e destino |
| `#ia` | Onde a inteligência artificial entra |
| `#como-funciona` | Do planejamento à experiência, em etapas |
| `#experimente` | Agendamento de apresentação do protótipo |
| `#sobre` | A Dyon e a presença no HackTown 2026 |
| `#publico` | Para quem é: organização, fornecedores, anfitriões, convidados |
| `#contato` | Formulário de interesse e canais diretos |

## Como foi feita

HTML, CSS e JavaScript puros. **Sem framework, sem dependências, sem etapa de
build** — o que está no repositório é exatamente o que vai para o ar.

- **Ícones em SVG inline**, desenhados no próprio HTML como um sprite de
  `<symbol>`. Nenhuma biblioteca de ícones, nenhuma requisição extra.
- **Responsiva** de verdade: pontos de quebra em 1080, 980, 900, 760 e 420px.
- **`prefers-reduced-motion`** respeitado — quem configurou o sistema para
  reduzir animações não recebe as transições de rolagem.
- **Open Graph** e `theme-color` configurados, para o link render bonito quando
  compartilhado no WhatsApp e nas redes.
- `lang="pt-BR"` e seções semânticas.

A única coisa buscada de fora são as fontes (Google Fonts).

### O que o JavaScript faz

Tudo em um arquivo só, comentado por blocos:

- menu mobile (abre, fecha no `Esc` e ao clicar em um link);
- barra de navegação que muda de estado ao rolar;
- destaque automático da seção em que o visitante está;
- animação de entrada dos elementos conforme aparecem na tela;
- agendamento de apresentação do protótipo;
- botões de interesse;
- formulário de contato com validação campo a campo e erros na hora;
- máscara de telefone no formato `(35) 99999-9999`;
- ano do rodapé sempre atualizado.

## Rodando na sua máquina

Não precisa instalar nada. Clone e abra o arquivo:

```bash
git clone https://github.com/SolangeRibeiro/leading_page-Dyon-oficial.git
```

Depois é só dar duplo clique em `index.html`.

Se preferir servir por HTTP — útil para testar o compartilhamento de link e o
Open Graph:

```bash
python -m http.server 5500
```

## Estrutura

```
.
├── index.html        Página inteira + sprite de ícones SVG
├── style.css         Sistema visual, tokens e responsividade
├── script.js         Interações (menu, rolagem, formulário)
├── .gitattributes    Padroniza quebras de linha entre Windows e Linux
└── .gitignore        Lixo de sistema e de editor fora do repositório
```

## Publicação

Hospedada no **Netlify**, com o domínio `dyonoficial.com.br` apontado por um
registro `A` na raiz e um `CNAME` no `www`, servidos pelo DNS do Registro.br.
Certificado TLS emitido pelo Let's Encrypt, com renovação automática.

## Limitações conhecidas

- O formulário de contato **não tem servidor**. Ao enviar, ele monta uma
  mensagem e abre o cliente de e-mail do visitante já preenchido. Funciona, mas
  depende de haver um app de e-mail configurado no aparelho — trocar isso por um
  endpoint de verdade (Netlify Forms, por exemplo) é a melhoria mais óbvia.
- Não há analytics nem cookies. Nada é rastreado.

---

© 2026 Dyon. Todos os direitos reservados.
