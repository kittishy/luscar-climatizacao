# Luscar Climatização — produto e direção de design

Documento interno. **Não é servido pelo site.** Tudo aqui é decisão de projeto;
a cópia pública vive em `src/pages/` e no manifesto de SEO.

---

## 1. O produto

Site institucional da **Luscar Climatização**, de Joinville/SC, em saída
estática com 13 rotas indexáveis. O objetivo declarado é apresentar o trabalho
real da empresa e facilitar contatos qualificados pelo WhatsApp.

Não é uma vitrine de serviços genéricos. A tese do site é esta: **a diferença
da Luscar aparece quando o acesso é o serviço.** Antes de qualquer frase, a
primeira tela mostra um técnico real trabalhando em altura.

## 2. Composição responsiva em três cenários

Planejada antes da implementação, conforme o contrato do briefing. CSS
mobile-first é a ordem de autoria do arquivo, **não** o critério de qualidade:
desktop e tablet têm decisões próprias.

### Desktop e notebook (≥ 900 px)

- **Container** 1240 px. A home usa um contêiner mais apertado, 990 px, porque
  a faixa flexível do texto deixava uma calha vazia de 300 px entre as
  palavras e a fotografia.
- **Hero assimétrico, dois trilhos limitados:** texto em `minmax(0, 440px)` e
  fotografia em `clamp(340px, 32vw, 480px)`, com `justify-content:
  space-between`. A assimetria é deliberada; a folga residual fica entre 66 e
  181 px conforme a largura, nunca um vazio de um terço da tela.
- **Altura disponível comada.** Entre 900 px e 860 px de altura (o caso
  1366×768 do briefing) o `--step-display` cai para 2,75 rem e a foto limita a
  500 px, para que título, apoio e os dois CTAs caibam acima da dobra. Medido:
  o CTA termina a 551 px numa janela de 768 px.
- **Leitura** entre 55 e 75 caracteres. O `max-width` do apoio é 52ch e o da
  prosa é 68ch.
- **2560 px** os fundos estendem, o conteúdo não: contêiner travado em 1240 px,
  apoio com no máximo 760 px.

### Tablet (768–1023 px)

- **Menu compacto a partir de 1024 px.** Abaixo disso os quatro links mais o
  botão de orçamento somariam cerca de 612 px; a 768 px isso deixaria a marca e
  os controles disputando espaço. O painel substitui a navegação inline antes
  da colisão, não depois.
- **Duas colunas só a partir de 900 px**, quando texto, foto e controles
  continuam confortáveis. Serviços e passos viram grade de duas; a galeria
  permanece em duas.
- **Retrato e paisagem têm composições distintas**, verificadas: 768×1024 usa
  empilhamento com a foto do cabeçalho acima do texto; 1024×768 recupera a
  divisão e a foto do cabeçalho passa para a coluna da direita.
- **Sem pressupor mouse.** Todos os alvos têm 44 px ou mais; `pointer: coarse`
  aumenta a barra de contato.

### Celular (< 900 px)

- **Leitura vertical clara:** cabeçalho, título, apoio, CTA, depois a
  fotografia. Sem três cartões na primeira tela.
- **Fotografia em proporção vertical com recorte medido**
  (`object-position: 50% 22%`), preservando rosto, cordas e unidade externa.
- **Barra fixa de WhatsApp** abaixo de 1024 px, com `env(safe-area-inset-bottom)`
  e altura reservada no `body`. Não existe bolha flutuante: uma afordância por
  vez.
- **Paisagem (844×390) é um caso próprio.** Com o menu aberto não há altura para
  a ação do painel e a barra fixa, então a barra se retira e o painel ocupa a
  tela. Corrigido depois de inspecionar o screenshot: a regra original estava
  no arquivo antes da regra base da barra e perdia por empate de especificidade.
- **320 px** reflowa sem rolagem horizontal; 200 % de zoom equivalente
  (640 px de viewport) também.

## 3. Identidade visual

### Cor — o contrato é medido, não estimado

Todos os pares foram calculados antes de existir a primeira regra CSS.

| Papel | Token | Valor | Contraste medido |
|---|---|---|---|
| Azul profundo | `--deep` | `#092A45` | 14,70 com branco |
| Azul de ação | `--action` | `#0759B8` | 6,71 com branco |
| Ciano | `--cyan` | `#20AFE3` | 5,81 sobre azul profundo |
| Gelo | `--ice` | `#F2F6F8` | 13,62 com tinta |
| Tinta | `--ink` | `#142A38` | 14,81 com branco |
| Tinta secundária | `--ink-2` | `#435B6B` | 7,12 com branco |
| Divisória decorativa | `--line` | `#D4E0E6` | decorativa |
| Borda de controle | `--line-strong` | `#6B8492` | 3,93 com branco |

**Duas combinações reprovadas na medição, e portanto proibidas:**

| Combinação | Razão | Consequência no projeto |
|---|---|---|
| Branco sobre ciano | 2,53 | Ciano **nunca** carrega texto branco. É só acento: filete, marca e ênfase curta sobre azul profundo. |
| Azul de ação sobre azul profundo | 2,19 | O azul de ação **nunca** é fundo de botão em seção escura. O CTA primário se inverte para azul profundo sobre branco. |

Essas duas inversões não são gosto; são a consequência aritmética das medidas.
O botão branco do cabeçalho e do bloco de contato existe por causa da segunda
linha da tabela.

### Tipografia

- **Barlow Condensed** 600/700 nos títulos. **Manrope** 400–700 no corpo.
- Manrope é **fonte variável**: um arquivo cobre todo o eixo. Medido: quatro
  pesos estáticos custavam 97 KB antes de qualquer texto ficar legível; o
  arquivo variável custa 24,3 KB. A troca também zerou o CLS.
- Barlow Condensed não tem arquivo variável no endpoint oficial (ambas as
  faixas `wght@600..700` e `wght@100..900` respondem 400), então segue com dois
  pesos estáticos.
- Somente o subset `latin`, que cobre integralmente os acentos do português
  (`ã ç é í ó ú â ê ô à`). O subset `latin-ext` nunca foi baixado na medição
  de transferência.
- `font-display: swap`, `font-synthesis` desligado por padrão, `preload`
  apenas nas duas faces da primeira tela.

### Forma

Cantos discretos (4–14 px), linhas para dividir e não para decorar, sombra só
onde comunica elevação (`--shadow-lift` no header e nos realces). Sem brilho,
sem glassmorphism, sem gradiente decorativo, sem número-contador, sem badge,
sem emoji.

## 4. Fotografia

Todas as imagens vêm de `assets/selecionados`, nunca geradas, nunca retocadas.
Nenhum rosto foi alterado, nenhum equipamento removido, nenhuma marca trocada.

**Cada photograph foi aberta individualmente** e o enquadramento medido em
percentual, o que define o `object-position` de cada uma. Três decisões vieram
disso:

- `hero-tecnico-em-altura.jpg` — rosto a ~18 % da altura, condensadora na borda
  esquerda, cordas em toda a altura. `object-position: 50% 22%` mantém os três.
- `instrumentos-em-servico.jpg` — o rosto **já está** cortado pela borda
  esquerda na origem. Por isso não entra na galeria como peça larga: vira
  detalhe pequeno na página de manutenção.
- Os três arquivos PEX têm **295×172 px** e são ilustrações do acervo, não
  obra comprovada. Só aparecem em módulo técnico pequeno, nunca ampliados
  além de 295 px, e o `figcaption` diz o que eles são.

**Regra dura: sem ampliação.** O gerador recusa emitir qualquer largura acima
da largura real da fonte, e o `maxRender` de cada foto é o teto honesto em que
o arquivo ainda tem detalhe — não o tamanho desejado no design.

## 5. O que este site deliberadamente não afirma

Cada item abaixo foi recusado porque a evidência não existe. A lista completa
está em `LIMITACOES.md`.

Sem endereço, e-mail, CNPJ, horário, mapa, nota, número de clientes, anos de
experiência, garantia, selo, certificação NR-35, assistência autorizada, marca
parceira, atendimento 24 h, resultado clínico, preço ou prazo. A página de
limpeza fala de cuidado de componente, não de saúde. A página de PEX diz que a
aplicação depende da especificação, e não promete compatibilidade universal.
O guia do aparelho que não gela manda **parar de usar** diante de cheiro de
queimado ou ruído anormal — e não ensina a abrir o equipamento.

Clicar em WhatsApp é **intenção de contato**, não cliente fechado. A página de
contato não tem formulário porque não existe backend: um formulário que finge
enviar seria pior que nenhum formulário.

## 6. Consistência entre rotas

Uma casca, `src/layouts/Base.astro`, resolve cabeçalho, rodapé, barra de
contato, `<head>` e schema JSON-LD. Componentes compartilhados para
breadcrumb, CTA de fechamento, FAQ, galeria e imagem responsiva. Isso é o que
mantém título, anel de foco, estilo de botão e link de rodapé idênticos nas 13
rotas — verificado por teste, não por inspeção.

## 7. Arquivos

| Caminho | Papel |
|---|---|
| `src/data/site.ts` | Fonte única: contatos, rotas, serviços, registro de fotos, curvas `sizes` medidas |
| `src/data/seo.ts` | Metadados, canonical por ambiente, grafo JSON-LD |
| `src/layouts/Base.astro` | Casca única do documento |
| `src/components/` | Header, Footer, PageHead, Rail, Gallery, Faq, Figure, Breadcrumb, ContactBar, ClosingCta, Seo |
| `src/styles/` | `fonts.css` gerado, `tokens.css`, `base.css`, `components.css` |
| `scripts/` | Imagens, fontes, rotas, vercel.json, screenshots, performance |
| `tests/` | Contrato (16 testes) e suíte responsiva em navegador (184 verificações) |