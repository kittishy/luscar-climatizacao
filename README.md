# Luscar Climatização — site

Redesign completo e novo SEO do site da **Luscar Climatização** (Joinville/SC).
Astro com saída estática, 13 rotas, imagens e fontes locais.

Documentos internos (**não** são servidos pelo site): [`PRODUCT.md`](PRODUCT.md),
[`DECISIONS.md`](DECISIONS.md), [`LIMITACOES.md`](LIMITACOES.md),
[`MIGRACAO.md`](MIGRACAO.md), [`RELATORIO-VALIDACAO.md`](RELATORIO-VALIDACAO.md).

---

## Requisitos

- Node.js 20 ou superior (validado em 22.19.0)
- npm 10 ou superior

## Instalação

```bash
npm ci
```

O `npm ci` não executa a geração de imagens: as fontes e os derivados já estão
versionados. Para regerá-los:

```bash
npm run fonts     # baixa as fontes do Google Fonts e grava a proveniência
npm run images    # gera AVIF/WebP/JPEG a partir de ../assets/selecionados
```

`npm run fonts` é a única etapa que precisa de rede, e só precisa ser executada
quando as fontes mudam.

## Desenvolvimento

```bash
npm run dev       # http://127.0.0.1:4321
```

## Build

```bash
npm run build
```

Executa, nesta ordem:

1. `npm run images` — derivados e os 35 caminhos antigos de imagem
2. `npm run config` — gera `vercel.json` conforme o modo
3. `astro check` — verificação de tipos de todos os `.astro`
4. `astro build` — HTML estático em `dist/`
5. `npm run routes` — `sitemap.xml` e `robots.txt` conforme o modo

## Modos de publicação

O modo **nunca** é inferido. O padrão é `preview`, que é seguro por construção.

```bash
# demonstração (padrão): noindex, canonical próprio, sitemap vazio
npm run build

# corte autorizado no domínio do cliente
SITE_MODE=production npm run build
```

| Variável | Valores | Padrão |
|---|---|---|
| `SITE_MODE` | `preview` \| `production` | `preview` |
| `SITE_ORIGIN` | origem, só no preview | `https://luscar-climatizacao.vercel.app` |
| `PUBLIC_ANALYTICS_ID` | ID real | vazio — adaptador desligado |

| | preview | production |
|---|---|---|
| `canonical` | própria origem | `https://luscarjoinville.com.br` |
| `robots` meta | `noindex, follow` | `index, follow` |
| `X-Robots-Tag` | `noindex, follow` | `index, follow` |
| `sitemap.xml` | vazio | 13 URLs |

Só `SITE_MODE=production` remove o `noindex` e fixa o canonical no domínio do
cliente. Produzir um build, por si só, não torna nada indexável.

Detalhes e configuração por hospedagem em [`MIGRACAO.md`](MIGRACAO.md).

## Verificação

```bash
npm test            # 16 testes de contrato contra dist/
npm run test:browser # 184 verificações em Chromium real
npm run verify       # build + contrato + navegador
```

- `npm test` — rotas, metadados, canonical, unicidade, contatos, links internos,
  ausência de template e de alegação fabricada, JSON-LD, status, sitemap, 404,
  dimensions das imagens, WhatsApp.
- `npm run test:browser` — as 13 rotas em 390/768/1440 px, overflow em 12
  larguras, reflow em 320 px, equivalente a 200 % de zoom, alvos de toque,
  menu com Escape e retorno de foco, lightbox, FAQ, movimento reduzido, barra
  fixa sem cobrir conteúdo, erros de console, integridade do link de WhatsApp.

Requer `npx playwright install chromium` uma vez.

## Desempenho e evidências

```bash
node scripts/perf.mjs      # medição de laboratório -> reports/performance.json
node scripts/capture.mjs   # screenshots -> screenshots/
```

`perf.mjs` é medição de laboratório com limitação simulada, em servidor local.
**Não é dado de campo e não é Core Web Vitals real.** Perfis desktop e mobile
são relatados separadamente e nunca sao combinados.

`capture.mjs` grava a matriz de validação: desktop 1440×900, 1366×768,
1920×1080; tablet 768×1024 e 1024×768; celular 390×844 e 844×390 — incluindo
as 13 rotas em 390, 768 e 1440 px, e os estados de menu, galeria, FAQ e foco.

**Screenshots são emulação de navegador em viewport, não teste em aparelho
físico.** Nenhuma página foi aberta em celular, tablet ou notebook reais.

## Publicação

```bash
vercel deploy --prod
```

`vercel.json` é gerado pelo build e já contém os quatro 410, os cabeçalhos por
modo e o `Cache-Control` dos derivados. **Não há regra de catch-all**, então um
caminho desconhecido responde 404 real.

Sequencia e precaucoes de corte em [`MIGRACAO.md`](MIGRACAO.md).

## Estrutura

```
src/
  data/site.ts        contatos, rotas, serviços, fotos, curvas sizes medidas
  data/seo.ts         metadados, canonical, grafo JSON-LD
  layouts/Base.astro  casca única do documento
  components/         Header, Footer, PageHead, Rail, Gallery, Faq, Figure,
                      Breadcrumb, ContactBar, ClosingCta, Seo
  pages/              13 rotas + 404
  styles/             fonts.css (gerado), tokens, base, components
  lib/                analytics (desligado), routes
scripts/              imagens, fontes, rotas, vercel.json, perf, capture
tests/                contrato e suíte de navegador
public/               media/ derivados, fonts/, favicon, caminhos antigos
```

## Manutenção de conteúdo

**Texto.** Cada página está em `src/pages/`. Para mudar título, descrição ou
H1, edite o objeto `meta` no topo do arquivo — o `canonical`, o JSON-LD e os
testes derivam dele. O cabeçalho e o rodapé são compartilhados: alterar um
altera as 13 rotas, o que é o comportamento desejado.

**Contatos.** `src/data/site.ts` é a fonte única. O número, o Instagram, as
rotas e as mensagens de WhatsApp aparecem de um lugar só. **Nunca** escreva um
número ou caminho de rota à mão dentro de um componente.

**Fotografias.** Para trocar uma imagem:

1. Coloque o original em `../assets/selecionados/`.
2. Registre origem, dimensões e alt em `../assets/manifesto-selecao.json`.
3. Atualize o registro em `photos` (`src/data/site.ts`) com largura real,
   `maxRender` e o `object-position` medido.
4. Atualize `PLAN` em `scripts/generate-images.mjs` — o `max` não pode passar
   da largura da fonte.
5. `npm run images && npm run build && npm test`.

O gerador **recusa** emitir qualquer largura acima da largura real da fonte, e
o teste de navegador falha se um arquivo entregue for menor que a caixa que
precisa servir.

**Novos textos.** Três regras não negociáveis:

- Não inventar endereço, e-mail, CNPJ, horário, preço, nota, anos de
  experiência, garantia, certificação, marca parceira ou prazo.
- Não afirmar resultado de saúde em serviço de limpeza.
- Não escrever instrução de instalação elétrica, fluido refrigerante ou
  trabalho em altura.

`npm test` reprova a reintrodução de qualquer uma delas, e também os dados de
template falsos do site antigo.

**Rotas novas.** Adicione em `routes` (`src/data/site.ts`), crie o arquivo em
`src/pages/` e registre em `ALL_ROUTES` (`src/data/seo.ts`). Os testes
descobrem o resto a partir do JSON do briefing — se uma rota nova não estiver
em `seo/paginas-propostas.json`, o sitemap de produção não a inclui.

## Limites conhecidos

- **Barlow Condensed não tem fonte variável** no endpoint oficial do Google
  Fonts (`wght@600..700` e `wght@100..900` respondem 400), então usa dois pesos
  estáticos. Manrope é variável.
- **Medição de desempenho é de laboratório.** Não há dado de campo.
- **Nenhuma publicação foi feita.** Ver `RELATORIO-VALIDACAO.md`.