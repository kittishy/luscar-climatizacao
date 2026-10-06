# Sistema visual — Luscar Climatização

Este documento é o contrato visual do site: o que existe, por que existe e o que
não pode ser quebrado. Ele não serve SEO e não é publicado.

Se você vai mudar cor, tipografia, ritmo ou proporção de um componente, leia a
seção correspondente antes. Todas as medidas aqui foram lidas do layout real em
1440×900, 1366×768, 1024×768, 900×800, 768×1024 e 390×844 — não estimadas.

---

## 1. Paleta e contraste

As cores vivem em [`src/styles/tokens.css`](src/styles/tokens.css). O valor de cada
uma está comentado com o contraste medido no fundo em que é usado.

| Token | Hex | Papel | Contraste medido |
|---|---|---|---|
| `--deep` | `#092a45` | cabeçalho, rodapé, seção de altura | base do `--on-deep` |
| `--deep-2` | `#0d3554` | superfície elevada dentro de seção escura | — |
| `--action` | `#0759b8` | CTA e link em superfície clara | 5.66:1 no branco |
| `--cyan` | `#20afe3` | **apenas acento** | 2.53:1 no branco |
| `--ice` | `#f2f6f8` | galeria e respiro | — |
| `--ink` | `#142a38` | texto principal | 12.1:1 no branco |
| `--ink-2` | `#435b6b` | texto secundário | 7.4:1 no branco |
| `--on-deep` | `#ffffff` | texto em fundo escuro | 14.7:1 no `--deep` |
| `--on-deep-2` | `#c9dce5` | texto secundário em fundo escuro | 10.40:1 no `--deep` |
| `--line` | `#d4e0e6` | divisória decorativa | 1.35:1 — **nunca** borda de controle |
| `--line-strong` | `#6b8492` | borda de controle | 3.93:1 no branco |

### As três regras que o `--cyan` impõe

1. **Nunca** texto branco sobre ciano: são 2.53:1. CTA sobre seção escura é
   sempre azul profundo com texto branco (14.7:1).
2. **Nunca** link de ação sobre azul profundo: são 2.19:1. Todo link dentro de
   `--deep` usa explicitamente `--on-deep`.
3. O ciano existe para moldura, borda de destaque e o chevron do `<summary>` —
   nunca como cor de texto corrido ou fundo de texto.

O rodapé chegou a renderizar com a regra `.footer` enquanto o HTML usa
`.site-footer`, então nenhuma das regras de contraste chegava nele. Todos os
seletores do rodapé agora são escopados em `.site-footer`, e
`tests/browser.mjs` mede o contraste de cada link do rodapé.

---

## 1b. Estados interativos

Cada estado tem um token e uma razão medida. Não há estado `:active` sem
`:hover` equivalente, porque um controle que responde ao ponteiro e não ao
dedo é um defeito, não uma escolha.

| Estado | Claro | Escuro |
|---|---|---|
| repouso | `--action` 6.71 | `--on-deep` 14.70 |
| `:hover` | `--action-hover` 8.59 | `--cyan-hover` 8.39 |
| `:active` | `--action-active` 11.01 | `--white` / `--deep-2` |
| `:focus-visible` | `--action` | `--cyan` 5.81 |

Tokens: `--action-hover`, `--action-active`, `--cyan-hover`, `--ice-active`.

### O anel de foco tem que ser listado

`:focus-visible` é azul de ação por padrão. Sobre azul profundo isso dá
**2.19:1**, ou seja, o anel fica invisível. Por isso a regra de superfície
escura é uma lista explícita:

```css
.on-deep :focus-visible,
.site-header :focus-visible,
.site-footer :focus-visible,
.contact-bar :focus-visible,
.lightbox :focus-visible { outline-color: var(--cyan); }
```

**Toda superfície escura nova precisa entrar nessa lista.** Sem ela, o foco
desaparece. `tests/browser.mjs` mede o anel em quatro superfícies e exige
pelo menos 3:1.

### Sem salto ao abrir um modal

```css
html { scrollbar-gutter: stable; }
```

Travar `overflow: hidden` no `<html>` ao abrir o painel ou o lightbox remove a
barra de rolagem e a página inteira anda uns 15px na horizontal. Com o espaço
reservado, abrir e fechar não move nada.

---

## 1c. O que foi removido, e por quê

### O kicker (`.eyebrow`)

O site marcava toda seção com um rótulo em versalete acima do título, precedido
de um filete. Isso é **kicker**, e kicker é um padrão de categoria, não uma
decisão de design: ele repete o que o título já diz, ocupa a primeira dobra e
transforma a página numa pilha de rótulos. Ele foi removido de todas as 13
rotas, e a regra `.eyebrow` saiu do CSS.

Nenhuma informação se perdeu: em quase todo caso o rótulo duplicava o próprio
título ("O que a Luscar faz" sobre "Serviços da Luscar"), e onde não duplicava
("Guia prático") a trilha de navegação já carregava a informação.

O filete ciano sobrevive onde faz sentido como marca: na legenda da foto do
serviço principal.

### Em dash

Nenhum travessão longo chega ao visitante. Onde a frase precisava de uma pausa,
virou ponto, vírgula ou dois-pontos. `tests/browser.mjs` percorre o texto
servido e falha se encontrar `—` ou `–`.

---

## 2. Tipografia

Duas famílias, cada uma com um trabalho:

- **`--font-body` (Manrope)** — corpo, H1, nomes de serviço, navegação, FAQ.
  É a família da leitura.
- **`--font-display` (Barlow Condensed)** — títulos de seção grandes. É a
  família da escala, não da navegação.

### A hierarquia que importa

Os nomes de serviço usavam a condensada em corpo pequeno, ao lado de um lead
maior. O olho caía no texto de apoio e não no nome do serviço. Hoje:

| Elemento | Família | Tamanho | Peso |
|---|---|---|---|
| H1 da home | display | `--step-display` | 700 |
| H2 de seção | display | `--step-h2` | 700 |
| Nome de serviço (`service-group__title`) | body | 1.1875rem | 600 |
| Lead de serviço | body | `--step-body` | 400 |
| Detalhe de serviço | body | `--step-body` | 400 |

### Quebra de linha

```css
h1, h2, h3, h4 { text-wrap: balance; }
p, .lead       { text-wrap: pretty; }
```

`balance` distribui as linhas do título para que a última não fique órfã.
`pretty` faz o mesmo nos parágrafos, com uma última linha levemente mais frouxa
em troca de nunca deixar uma palavra sozinha.

Isso não resolve a quebra dentro de `ar-condicionado`: CSS não impede a quebra
num hífen que já está no texto, só a hifenização automática. A palavra é
envolvida em `.nowrap` na renderização do H1.

### Medida em `ch` depende da família

`max-width` em `ch` vale para a família em que é medido. `20ch` na condensada
dá ~230px, `20ch` na Manrope dá ~330px. Onde a medida estava curta demais para o
título, o valor foi corrigido pela medida real, não pela leitura do número
(ex.: o H2 do bloco de fecho estava em 20ch e quebrava em três linhas curtas).

### Escala fluida

```
--step-display: clamp(2.125rem, 1.35rem + 3.3vw, 3.75rem)
--step-h2:     clamp(1.5rem,   1.18rem + 1.4vw, 2.125rem)
--step-h3:     clamp(1.1875rem, 1.1rem + 0.4vw, 1.375rem)
--step-lead:   clamp(1.0625rem, 1.01rem + 0.3vw, 1.25rem)
--step-body:   clamp(1rem, 0.975rem + 0.14vw, 1.0625rem)
```

O hero é a única seção autorizada a reagir à **altura** disponível
(`max-height: 860px`): é a única cujo título, lead e dois CTAs precisam caber
acima da dobra.

---

## 3. Medidas e ritmo

```
--container:       1240px   (banda pedida: 1200–1280)
--container-narrow: 760px    (~62–72 caracteres em --step-body)
--gutter:           clamp(1.25rem, 0.7rem + 2.2vw, 3rem)
--section-y:       clamp(3rem, 1.9rem + 4.6vw, 6.5rem)
```

### Hero da home

O hero tem container próprio, **não** o do site:

```css
.hero .container { max-width: calc(1120px + var(--gutter) * 2); }
```

Motivo: a 1240px a faixa de texto flexível ficava com ~700px contra uma medida
legível de ~455px, deixando um vazio de 300px+ entre as palavras e a foto. A
1020px a faixa caía para 415px e o H1 quebrava em quatro linhas. 1120px dá
540px de texto + 480px de foto com folga, e mantém o hero na mesma escala do
resto do site.

| Viewport | Texto | Foto | H1 | Hero |
|---|---|---|---|---|
| 1440×900 | 540px | 480px | 3 linhas @60px | 779px |
| 1366×768 | 540px | 400px | 2 linhas @44px | 621px |
| 1024×768 | 540px | 360px | 2 linhas @43px | 563px |
| 900×800 | 432px | 360px | 3 linhas @41px | 558px |
| 768×1024 | 569px | 420px | 2 linhas @47px | 1076px |
| 390×844 | 335px | 350px | 3 linhas @34px | 1054px |

### Tablet (640–899px)

Faixa própria e deliberada, porque abaixo de 900px o hero é empilhado e não
existe uma segunda faixa para limitar a medida:

```css
@media (min-width: 640px) and (max-width: 899px) {
  .hero .container { max-width: calc(760px + var(--gutter) * 2); }
  .hero__copy       { max-width: 56ch; }        /* era 34ch: 346px em ~697px */
  .hero__figure     { max-width: 420px; margin-inline: auto; }
  .hero__media      { aspect-ratio: 4/5; max-height: 525px; }
}
```

O `max-width: 34ch` herdado do celular media **346px** e a foto ocupava 712px
abaixo, deixando o hero com 1711px e metade da tela vazia à direita do texto.

---

## 4. Grades que precisam fechar

### `.services-grid` — hierarquia, não cards

Os serviços **não** são quatro blocos iguais. Um é o serviço que define a
empresa e recebe a fotografia, o azul profundo e a prosa longa; os outros três
são um índice compacto.

```
<hero>
<índice dos serviços secundários>      seção clara, 3 colunas, filete entre linhas
<bloco principal em azul profundo>     seção escura, foto + prosa + o pedido
<galeria>
```

Isso substituiu duas coisas de uma vez: a parede de quatro cards idênticos, e a
seção de acesso por cordas que repetia a mesma fotografia e o mesmo argumento
logo abaixo da lista.

A escolha é feita no dado, não no layout:

```ts
// src/data/site.ts
export const primaryService = { key: 'altura', photo: 'alpinismoFachada', ... };
export const secondaryServices = [ /* tres */ ];
export const serviceGroups = [primaryService, ...secondaryServices];
```

O serviço primário é exportado com nome próprio em vez de marcado com um
sinalizador, para que nenhum consumidor receba `undefined` e para que "qual
serviço lidera" seja um fato e não uma busca que pode falhar.

Três colunas a partir de **900px**, uma abaixo. A 768px três colunas de ~230px
espremeriam uma frase num toco hifenizado; empilhado, cada entrada lê como uma
linha de índice. Isso é uma decisão sobre este conteúdo, não o desenho do
celular herdado por omissão.

A coluna do bloco principal é 1.05fr e a do texto 1fr, sem `order`. A fotografia
vem primeiro por ordem do documento, não por reordenação: um `order` já vazou
uma vez para os cabeçalhos internos.

### `.faq--columns`

Opt-in via prop `columns` do componente [`Faq.astro`](src/components/Faq.astro).
A home usa; as internas não, porque duas ou três perguntas deixariam uma coluna
alta e vazia.

### Galeria

A grade tem três colunas. Um tile largo ocupa duas, então a grade só fica sem
buraco quando `itens + largos` é múltiplo de três:

| Onde | Itens | Largos | Células | Grade |
|---|---|---|---|---|
| home / `/projects/` | 6 | 0 | 6 | 3×2 exata |
| `/about/` | 3 | 0 | 3 | 1×3 |
| página de altura | 4 | 2 | 6 | 2×3 exata |

A home já usou 6 itens com 2 largos (8 células) e deixou um buraco visível na
última linha. **Ao adicionar fotos, confira a aritmética.**

---

## 5. Recorte de imagem

Cada foto declara sua própria posição de recorte em
[`src/data/site.ts`](src/data/site.ts) no campo `position`, medida contra o
arquivo original. Ela é aplicada como custom property
`--photo-position`, nunca como classe utilitária ad-hoc.

### Proporção por orientação

```css
.gallery__btn img                  { aspect-ratio: 4 / 5; }  /* tile normal */
.gallery__item--wide-landscape img  { aspect-ratio: 16 / 9; }
.gallery__item--wide-portrait img   { aspect-ratio: 4 / 3;  }
```

O tile largo usava 16:9 para **todas** as orientações. Uma foto de 960×1280
recortada em 16:9 mantém ~40% da altura e o sujeito desaparece da moldura. Por
isso a proporção depende da orientação da fonte, e `wideIndices` deve receber
preferencialmente índices de fonte horizontal.

### Sem upscale

Toda imagem declara `width`/`height` e o browser baixa um arquivo **maior ou
igual** à caixa. As curvas `sizes` em `src/data/site.ts` foram lidas do layout
renderizado, não estimadas; `tests/browser.mjs` mede isso em cinco combinações
de viewport e rota.

---

## 6. Cabeçalho interno (`.page-head`)

O `.page-head` usa a **própria** classe `.page-head__figure`. Ele usava
`figure.altitude__media`, e a regra `.altitude__media { order: -1 }` — escrita
para a seção de acesso por cordas — vazava para todo cabeçalho interno: a foto
ia para a primeira coluna (673px) e o H1 ficava espremido na segunda (404px).

```css
.page-head__grid            { grid-template-columns: 1.1fr 0.9fr; }
.page-head__grid--text      { grid-template-columns: 1fr; }   /* sem foto */
```

O modificador precisa estar **dentro** do `@media (min-width: 900px)`: com a
mesma especificidade de `.page-head__grid`, fora do media query a regra de duas
colunas vence por ordem de origem e sobra uma coluna vazia.

Páginas sem foto declaram a variante de texto e ganham uma largura editorial
maior (68ch em vez de 56ch).

---

## 7. Navegação compacta

O painel é um `<nav>` com links comuns — funciona por teclado e toque sem
framework. O JavaScript só gerencia estado, Escape e foco.

- **Abertura:** todo elemento fora do painel recebe `inert` — `<main>`,
  `.site-footer`, `.contact-bar`, `.skip-link` e `.brand`. O toggle é
  deliberadamente excluído: `Shift+Tab` a partir do primeiro item precisa
  chegar nele.
- **Por que `inert`:** um atributo declarativo que corrige foco, rolagem e
  exposição a leitor de tela juntos, em vez de uma armadilha de foco feita à mão
  que pode vazar.
- **Regra de cascata:** os links do painel recebem `.nav-panel__link`. A regra
  antiga `.nav-panel a` também casava com o CTA, deixando texto branco sobre
  fundo branco (1:1). Nenhum seletor de link do painel deve usar `a` puro.
- O rótulo do botão alterna entre "Abrir" e "Fechar" e o `aria-expanded`
  acompanha.

---

## 8. Alvos de toque

Mínimo **44×44px** em tudo que é interativo, medido em
`tests/browser.mjs`. Onde o texto não permite uma caixa fixa, o alvo vem de
padding com margem negativa:

```css
.footer__bottom a {
  min-height: 44px;
  padding-block: 0.4rem;
  margin-block: -0.4rem;   /* a linha não estica, o alvo alcança 44px */
}
```

### A barra fixa e o painel não dividem a tela

Com o painel compacto aberto, a barra de contato se retira e o `padding-bottom`
reservado no `<body>` é liberado junto:

```css
body[data-nav-open='true'] .contact-bar { display: none; }
body[data-nav-open='true']               { padding-bottom: 0; }
```

O atributo é escrito em `<body>` pela mesma função que abre o painel, e não por
`body:has(.nav-panel[data-open='true'])`: a forma com `:has()` não faz nada em
um motor sem suporte, o que deixaria a barra pintada sobre o botão de WhatsApp
do próprio painel.

`inert` já tira a barra da ordem de foco, mas ela continuaria pintando por
cima da ação do painel. Em paisagem baixa (844×390) a regra continua valendo: não
há altura para as duas.

A barra reserva a safe-area do dispositivo com `--bar-safe-b`
(`env(safe-area-inset-bottom, 0px)`), somada à altura real em `padding-bottom`
do `<body>`, então ela nunca cobre conteúdo.

---

## 9. O que não pode

- Nenhum endereço, e-mail, CNPJ, horário, preço, nota, garantia, tempo de
  experiência, certificação ou marca parceira. Nada disso foi confirmado.
- Nenhuma promessa de saúde nem de compatibilidade universal de PEX/EPEX.
- Nenhuma mensagem de WhatsApp enviada automaticamente.
- Nenhuma afirmação de rich result de FAQ. O Google retirou o rich result de
  FAQ do desktop e do mobile em 2026; nenhum `FAQPage` é emitido.
- Nenhum formulário. Não há back-end, e um formulário que finge enviar seria
  mentira.
- Nenhuma imagem de trabalho que não seja uma foto real publicada pela empresa.

Ver [`LIMITACOES.md`](LIMITACOES.md) para o texto completo e
[`PRODUCT.md`](PRODUCT.md) para o posicionamento.

---

## 10. Portões de verificação

```bash
npm run verify
```

- `astro check` + `tsc --noEmit` — 0 erros
- `tests/*.test.ts` — 23 testes de contrato
- `tests/browser.mjs` — 248 verificações em navegador real, incluindo:
  - `[15]` regressão medida contra os defeitos da revisão de 06/10/2026
  - `[16]` anel de foco em quatro superfícies escuras, `scrollbar-gutter`,
    e a barra de contato cedendo espaço ao painel aberto

O detector mecânico da skill também roda sobre `src`:

```bash
impeccable detect --json src
```

Para reproduzir as medidas de um achado específico:

```bash
npm run build
npm run preview &
node scripts/repro-frontend.mjs
```

Os dois scripts medem estilos computados no navegador, não estimam. As duas
fontes de prova precisam concordar antes de um achado ser dado como resolvido.