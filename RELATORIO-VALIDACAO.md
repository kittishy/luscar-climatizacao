# Relatório de validação

Documento interno. **Não é servido pelo site.**

Cada afirmação abaixo vem de um comando executado nesta sessão, com a saída
real. Onde não houve verificação, isso está dito.

---

## 1. Resumo

| Item | Estado |
|---|---|
| 13 rotas do contrato, HTML pré-renderizado | Concluído e verificado |
| Build + verificação de tipos | Concluído, 0 erro |
| Testes de contrato | 16/16 |
| Suíte responsiva em navegador | 184/184 |
| Matriz de screenshots | 115 arquivos |
| Modos preview e production | Ambos construídos e conferidos |
| Publicação da demonstração | Feita e verificada ao vivo |
| Corte do domínio do cliente | **Não feito** — depende de autorização |
| Medição de campo (Core Web Vitals) | **Não feita** — depende de tráfego real |
| Teste em aparelho físico | **Não feito** — ver ressalva na seção 8 |

---

## 2. Comandos executados

### Build

```
> npm run build
images: 107 derivative files, 3990 KB total
images: 35 legacy upload paths served at their original URL
vercel.json written for mode=preview
  4 template routes rewritten to /api/gone (real HTTP 410)
[build] 0 errors
[build] 14 page(s) built in 1.86s
routes: sitemap (0 url) + robots.txt written for mode=preview
```

14 páginas = 13 rotas do contrato + 404 real.

### Verificação de tipos

```
> npx tsc --noEmit -p tsconfig.json
(exit 0, sem saída)
```

`astro check` também roda dentro do build e reportou 0 erros.

### Testes de contrato

```
> npm test
# tests 16
# pass 16
# fail 0
```

### Suíte responsiva em navegador

```
> node tests/browser.mjs
RESPONSIVE BROWSER SUITE: 184/184 checks passed
```

Cobertura: 13 rotas em 390, 768 e 1440 px; overflow horizontal em 12 larguras
(320, 375, 390, 430, 768, 900, 1024, 1120, 1366, 1440, 1920, 2560); reflow
em 320 px; equivalente a 200 % de zoom; alvos de toque ≥ 44 px; menu com
Escape e retorno de foco; lightbox com retorno de foco; FAQ por teclado;
movimento reduzido; barra fixa sem cobrir conteúdo; erro de console zero nas 13
rotas; integridade do link de WhatsApp.

---

## 3. Contraste medido

Calculado antes de existir qualquer regra CSS, e guardado em
`src/styles/tokens.css` com o resultado ao lado de cada token.

| Par | Razão | Veredito |
|---|---|---|
| tinta `#142A38` / branco | 14,81 | aprovado |
| tinta / gelo `#F2F6F8` | 13,62 | aprovado |
| tinta secundária `#435B6B` / branco | 7,12 | aprovado |
| tinta secundária / gelo | 6,55 | aprovado |
| branco / azul profundo `#092A45` | 14,70 | aprovado |
| branco / azul de ação `#0759B8` | 6,71 | aprovado |
| azul de ação / branco | 6,71 | aprovado |
| ciano `#20AFE3` / azul profundo | 5,81 | aprovado |
| borda de controle `#6B8492` / branco | 3,93 | aprovado (≥3) |
| borda de controle / gelo | 3,62 | aprovado (≥3) |

**Reprovados, e portanto proibidos:**

| Par | Razão | Como o projeto resolveu |
|---|---|---|
| branco / ciano | **2,53** | Ciano é só acento: filete, marca e ênfase curta sobre azul profundo. Nunca carrega texto branco. |
| azul de ação / azul profundo | **2,19** | O azul de ação nunca é fundo de botão em seção escura. O CTA se inverte para azul profundo sobre branco — é por isso que o botão do cabeçalho é claro. |

---

## 4. Imagens

### Sem ampliação

O gerador **recusa** emitir qualquer largura acima da largura real da fonte. O
teste de navegador compara a largura do arquivo realmente entregue, extraída do
descritor em `currentSrc`, com a caixa renderizada.

```js
const m = img.currentSrc?.match(/-(\d+)\.(avif|webp|jpg|png)$/);
if (fileWidth < cssWidth * 1.02) -> falha
```

Esse teste encontrou **três defeitos reais** durante a execução:

1. `/about/` e `/projects/` entregavam arquivos menores que a caixa.
2. A causa era dupla: curvas `sizes` subestimadas, e um `:nth-child()` no CSS
   que alargava a peça enquanto o componente dizia outra coisa. Layout e dica
   de recurso agora vêm da mesma fonte.
3. Corrigido medindo o layout renderizado em 8 larguras e gravando as curvas em
   `src/data/site.ts`.

### Enquadramento

Cada fotografia foi aberta individualmente e o sujeito medido em percentual.
Três decisões vieram daí:

- **Hero** — `object-position: 50% 22%` mantém rosto, cordas e condensadora
  juntos em todos os recortes. Conferido por inspeção visual no desktop, no
  celular e no live.
- **`instrumentos-em-servico.jpg`** — o rosto já está cortado pela borda
  esquerda **na própria origem**. Excluída da galeria; usada só como detalhe
  pequeno.
- **PEX** — 295×172 px, ilustrações do acervo. Só em módulo técnico pequeno,
  nunca ampliadas, com legenda dizendo o que são.

Derivados: 107 arquivos (AVIF + WebP + JPEG), 3990 KB no total, distribuídos em 8 a 13 arquivos por fotografia conforme o espaço real.

Legado: os **35** caminhos antigos de `seo/assets-publicados.csv` são servidos
no caminho original, não redirecionados.

---

## 5. Desempenho de laboratório

Servidor estático local, limitação simulada via CDP.

**Perfis, relatados separadamente e nunca combinados:**

- **Desktop:** 1440×900, 10 Mbps, 20 ms, CPU 1×
- **Mobile:** emulação Pixel 7, 4 Mbps, 85 ms, CPU 4×

| Perfil | Rota | FCP | LCP | CLS | Requisições | Transferência |
|---|---|---|---|---|---|---|
| desktop | home | 260 ms | 260 ms | 0 | 11 | 188 KB |
| desktop | instalação | 228 ms | 228 ms | 0 | 8 | 126 KB |
| desktop | manutenção | 236 ms | 236 ms | 0 | 8 | 139 KB |
| mobile | home | 740 ms | 740 ms | 0 | 10 | 184 KB |
| mobile | instalação | 652 ms | 652 ms | 0 | 8 | 129 KB |
| mobile | manutenção | 676 ms | 676 ms | 0 | 8 | 144 KB |

Dados brutos em `reports/performance.json`.

**Isto é medição de laboratório. Não é dado de campo.** Não é Core Web Vitals
real, não vem de usuários reais e **não é sinal de ranking**. As metas do
briefing (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1) são para medir depois do
lançamento, com tráfego real.

### Ganhos medidos durante a execução

| Otimização | Antes | Depois |
|---|---|---|
| Fontes: Manrope 4 pesos estáticos → variável | 97 KB | 24,3 KB |
| CLS na home | 0,0435 | **0** |
| Requisições na home | 13 | 11 |
| Transferência na home | 255 KB | 188 KB |
| Logo PNG quantizado | 25 KB | 8,7 KB |

Total de fontes no `dist`: 68 KB (antes 141 KB).

---

## 6. SEO e migração

### Modo production (construído e conferido)

```
canonical : https://luscarjoinville.com.br/
robots    : index, follow, max-image-preview:large
og:url    : https://luscarjoinville.com.br/
sitemap   : 13 urls
robots.txt: Allow: / + Sitemap
X-Robots-Tag: index, follow + HSTS + nosniff + Referrer-Policy
```

### Modo preview (padrão, construído e conferido)

```
canonical : https://luscar-climatizacao.vercel.app/
robots    : noindex, follow, max-image-preview:large
X-Robots-Tag: noindex, follow
sitemap   : 0 urls  (intencionalmente vazio)
robots.txt: Allow: /  (permite ler a diretiva)
```

Produzir um build **não** torna nada indexável. Só `SITE_MODE=production`
remove o `noindex`.

### Verificação ao vivo na demonstração

Executada contra a URL publicada, não contra o comando de deploy.

| Verificação | Resultado |
|---|---|
| 13 rotas respondem 200 com H1 próprio | 13/13 |
| 4 restos de template | **410 real** nos quatro |
| Caminho desconhecido | **404 real** (não a home) |
| `X-Robots-Tag` na home | `noindex, follow` |
| canonical e og:url | própria origem |
| `contact@example.com` | 0 ocorrências |
| `123 Fifth Avenue` | 0 ocorrências |
| `800-123-456` | 0 ocorrências |
| `Lorem ipsum` / `Who We Are` | 0 ocorrências |
| Dígitos de WhatsApp em 4 rotas | 1 único valor: `554784824814` |
| Caminhos antigos de imagem | **35/35 servem 200** |
| favicon, og, derivado, logo, fonte | 200 |

### Defeito encontrado e corrigido na publicação

A primeira configuração de `vercel.json` usava
`redirects: [{ status: 410 }]`. **O Vercel rejeita** — `redirects` só aceita
301, 302, 307 e 308. O deploy falhou, e as alternativas que "funcionariam"
seriam piores: arquivo estático nesses caminhos devolveria 200, dizendo ao
buscador que aquilo é conteúdo; redirecionar para a home é proibido pelo
briefing.

Correção: os quatro caminhos reescrevem para `api/gone.js`, que devolve **410
HTTP real** com corpo curto explicando a remoção. A função recusa qualquer
caminho fora da lista conhecida, para que um erro futuro de reescrita não a
transforme em um 410 genérico.

---

## 7. Defeitos encontrados por inspeção visual

Build e testes passavam nos três casos abaixo. Só apareceram olhando a tela.

1. **Hero em 1366×768** — o H1 era enorme, o trilho de texto era estreito
   demais e o CTA caía abaixo da dobra, com uma calha vazia de 361 px entre o
   texto e a foto. Corrigido com trilhos limitados, contêiner do hero
   apertado em 990 px e uma regra de altura disponível que reduz o display
   abaixo de 860 px de altura. Medido: CTA termina a 551 px numa janela de
   768 px; a folga ficou entre 66 e 181 px.
2. **Menu aberto em 844×390** — a barra fixa de WhatsApp cobria a ação do
   painel. A regra que a desligava estava no arquivo **antes** da regra base da
   barra e perdia por empate de especificidade. Movida para junto da barra.
3. **Menu no celular em retrato** — o botão de contato aparecia cortado atrás
   da barra fixa. Painel passou a reservar a altura real.

---

## 8. O que NÃO foi verificado

Declarado sem ambiguidade:

- **Nenhum aparelho físico.** Todos os screenshots e todas as verificações de
  toque são **emulação de navegador em viewport**. Não houve teste em celular,
  tablet ou notebook reais. Comportamento real de teclado, toque e safe-area
  precisa de conferência em aparelho.
- **Nenhuma medição de campo.** Sem tráfego real não há Core Web Vitals.
- **Nenhuma afirmação de ranking.** O Keyword Tool não forneceu volume, CPC ou
  dificuldade, e nada aqui estima posição, visita ou cliente.
- **Sem Search Console, GA4, logs ou backlinks.** O plano pós-lançamento está
  em `MIGRACAO.md`.
- **Nenhum contato enviado.** Os testes validam o `href` e a codificação; o
  envio é ação do visitante.
- **Corte do domínio não executado.** Requer autorização da responsável e
  acesso operacional. Nenhum DNS, WordPress ativo, Search Console ou Perfil da
  Empresa foi tocado.
- **Nenhuma conclusão de qualidade visual subjectiva** foi usada como prova. Os
  defeitos da seção 7 foram vistos em imagem e corrigidos com medição.

---

## 9. Evidências

### Screenshots: 115 arquivos

| Pasta | Arquivos | Conteúdo |
|---|---|---|
| `screenshots/desktop/` | 27 | 1440×900, 1366×768, 1920×1080, página inteira e primeira tela |
| `screenshots/tablet/` | 18 | 768×1024 (retrato) e 1024×768 (paisagem) |
| `screenshots/mobile/` | 18 | 390×844 (retrato) e 844×390 (paisagem) |
| `screenshots/routes/` | 39 | as 13 rotas em 390, 768 e 1440 px |
| `screenshots/states/` | 5 | menu aberto (retrato e paisagem), lightbox, FAQ, foco |
| `screenshots/live/` | 8 | capturados da **URL publicada** |

As imagens mostram fontes e fotografias carregadas: o script força
`loading="eager"` e espera cada imagem decodificar antes de capturar. Uma
metade carregada não é evidência de nada.

### Publicação

- Demonstração: **https://luscar-climatizacao.vercel.app**
- Repositório: `github.com/kittishy/luscar-climatizacao` (privado)
- Verificada ao vivo, com os resultados da seção 6.

---

## 10. Mensagem para a cliente

> Olá, Lucas.
>
> Preparei uma versão nova do site da Luscar. Está no ar:
> **https://luscar-climatizacao.vercel.app**
>
> A principal mudança é a primeira tela: agora mostra um técnico real
> trabalhando em altura, que é o que diferencia o serviço de uma instalação
> comum. O site também ganhou páginas próprias para instalação em prédios,
> acesso por cordas, manutenção, limpeza e tubulação PEX, dois guias que
> respondem dúvidas comuns, e uma galeria com o trabalho publicado.
>
> O contato é pelo WhatsApp, com mensagem pronta conforme a página — não tem
> formulário, porque não existe sistema por trás dele.
>
> Duas observações sobre o endereço: o site atual **não será alterado** por
> essa publicação, e o endereço novo continua marcado como não indexável
> pelos buscadores até você autorizar a virada. Isso é proposital.
>
> Os seus contatos atuais foram preservados exatamente como estavam, e os
> endereços das páginas antigas continuam válidos, então nenhum link
> publicado se perde.
>
> Vale abrir no celular e no computador para ver como ficou em cada tela.