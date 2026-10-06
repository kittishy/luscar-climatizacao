# Decisões de implementação

Documento interno. **Não é servido pelo site.**

Cada decisão registra a alternativa descartada e a evidência que a motivou.
Decisões sem evidência mensurável estão marcadas como tal.

---

## 1. Astro com saída estática

**Escolha:** Astro 5, `output: 'static'`, `trailingSlash: 'always'`,
`build.format: 'directory'`.

**Por quê.** O briefing pede 13 páginas com HTML completo e pré-renderizado,
layout compartilhado e pouco JavaScript. Astro entrega rotas de arquivo reais,
HTML estático por rota e um `<script>` só onde existe interação. Um build de
página única com Vite — que é o padrão do projeto vizinho
`cn-marmores-granitos-site` — atenderia ao mesmo objetivo de qualidade, mas
não ao de rotas reais: ele resolve um único `index.html` e jogaria as outras 12
URLs num roteador de cliente, o que viola diretamente os requisitos de
HTML estático, SSR, status 404 real e ausência de fallback de SPA. Preferi
manter o padrão local onde ele serve e divergir onde ele não serviria.

**Adotado do vizinho:** `tsc --noEmit` no build, testes com
`node --experimental-strip-types --test`, Playwright para navegador,
`vercel.json`, `PRODUCT.md` e `DECISIONS.md`.

**Sem React.** Nenhum estado de aplicação justifica um framework de
componentes. As duas únicas interações — menu e lightbox — são ~40 linhas de
JavaScript sem dependência.

## 2. `sizes` medido, não estimado

Este foi o erro mais caro do projeto e vale registrar.

**Sintoma.** O navegador baixava um arquivo menor que a caixa que ele
precisava servir, e a fotografia era ampliada. `naturalWidth` reporta 233 para
um arquivo de 360 px quando há `srcset` + `sizes`, porque o valor é corrigido
pela densidade — a primeira versão do teste comparava a caixa com
`naturalWidth` e media a coisa errada.

**Causa raiz.** As curvas `sizes` eram estimadas em `vw`, e o
`vw` ignora o trilho da grade. Onde a grade limita a coluna, `33vw` superestima
a caixa e o navegador escolhe o arquivo errado.

**Correção, em duas partes.**

1. O teste passa a extrair a largura do arquivo realmente entregue, do
   descritor em `currentSrc`, e compara com a caixa renderizada.
2. As curvas passaram a ser **medidas**: rodei o navegador em 390, 560, 768, 900,
   1024, 1120, 1440 e 1920 px, li a largura real de cada elemento e gravei o
   resultado em `sizes` (`src/data/site.ts`) como constantes nomeadas —
   `sizes.hero`, `sizes.pageHead`, `sizes.galleryTile` e assim por diante.

**Efeito colateral positivo.** O mesmo levantamento expôs um segundo defeito: o
CSS auto-alargava o primeiro e o quinto item da galeria com
`:nth-child(1)` e `:nth-child(5)`, enquanto o componente decidia o
`span` por `wideIndices`. Layout e dica de recurso vinham de fontes diferentes,
e o resultado era uma peça de 753 px de largura com um `sizes` de 380 px. A
regra CSS agora só obedece à classe que o componente aplica. Um único lugar
decide.

## 3. A barra fixa e a regra que perdia no CSS

A barra de contato aparece abaixo de 1024 px. Em paisagem (844×390) não há
altura para a ação do próprio painel e para a barra fixa, então a barra se
retira.

A primeira versão dessa regra estava no bloco do header, **antes** da regra
base de `.contact-bar`. Com especificidade igual (`0,1,0`), a regra posterior
venceu e a barra continuou aparecendo sobre o menu aberto. O screenshot de
844×390 mostrou isso; a regra foi movida para junto das regras da barra.

Registro porque é a classe de defeito que nenhum teste de build pega: só
aparece olhando a tela.

## 4. Ciano e azul de ação: duas proibições medidas

`white` sobre `cyan` dá 2,53:1 e `action` sobre `deep` dá 2,19:1. As duas
combinações são inseguras. Em vez de escolher um tom mais escuro e inventar
desvio do briefing, o projeto **inverte**: o ciano é só acento e o CTA em
seção escura vira azul profundo sobre branco.

Consequência prática: o botão do cabeçalho e o do bloco de contato são claros
mesmo sobre o azul profundo. Isso contraria o instinto de "botão
destaca no escuro", e é a resposta correta a 2,19:1.

O teste de contrato proíbe texto branco sobre ciano em qualquer lugar do
HTML construído.

## 5. Ciano e acento: o teste sabe distinguir recusa de afirmação

O briefing proíbe alegações como "elimina vírus". A página de limpeza diz
exatamente isso — porém como recusa: "não elimina vírus nem previne doenças".

Um teste de substring simples acusaria a página_copy de estar afirmando a
proibição. O teste então trabalha por **cláusula**: para cada termo proibido
encontrado, examina a cláusula que o contém e só falha se ela **não** tiver um
marcador de negação. "não elimina vírus" passa; "elimina vírus" sozinho falha.

## 6. Fontes variáveis onde existem

Manrope é variável: um arquivo de 24,3 KB cobre 400–700. Quatro pesos estáticos
custavam 97 KB antes de o texto ficar legível. Medido depois da troca: CLS de
0,0435 → **0** na home e de 0,0001 → **0** nas demais, requisições de 13 → 11.

Barlow Condensed não tem arquivo variável no endpoint oficial — `wght@600..700`
e `wght@100..900` respondem 400. Mantive dois pesos estáticos, que é a menor
forma correta disponível.

O subset `latin-ext` foi removido do download depois que a medição de
transferência mostrou que ele nunca era requisitado. Os acentos do português
cabem todos em `latin`.

## 7. `src=""` no diálogo da galeria

O `<img>` do lightbox nasceu com `src=""`. Isso resolve o atributo contra a URL
do documento: o navegador pede o HTML como se fosse imagem, marca a imagem
como quebrada e qualquer verificação de "todas as imagens carregaram" falha
para sempre. O atributo foi **removido** em vez de receber um PNG transparente
qualquer. `width`/`height` continuam declarados, então o diálogo reserva o
espaço antes de abrir.

## 8. Sitemap vazio no preview

No modo preview as 13 rotas têm `indexable_preview: false`. Emitir URLs
nesse sitemap contradiria o `noindex` que o mesmo build aplica em cada
`<head>`. O sitemap de preview sai vazio, e o `robots.txt` de preview
permite a leitura em vez de bloqueá-la — um crawler impedido não consegue ler
o `noindex` que deveria obedecer. O bloqueio correto é o cabeçalho
`X-Robots-Tag`, que permite ler e desaconselha indexar.

## 9. 410 real para os quatro restos de template

`/ola-mundo/`, `/pagina-exemplo/`, `/author/projetos/` e
`/category/sem-categoria/` recebem **410 Gone** em `vercel.json`.

Não redirecionam para a home. Sem Search Console não se sabe se carregam
backlinks, e redirecionar um resto de template para a página inicial é
enganoso. Um 410 honesto preserva o registro histórico e diz ao buscador que
aquilo nunca foi conteúdo.

## 10. Os 35 caminhos antigos de imagem são servidos, não redirecionados

`seo/assets-publicados.csv` lista 35 URLs. O gerador copia cada arquivo para o
caminho original sob `public/`. Servir no caminho antigo, em vez de
redirecionar, preserva links de entrada com zero saltos e risco zero de laço.

Efeito colateral: o HTML publicado passa a ter 35 arquivos de imagem a mais que
o site realmente usa. Isso é deliberado e barato — o `dist` não é o que é
publicado num repositório, e o custo é de armazenamento, não de requisição.
A alternativa (redirecionar 301 cada um) acrescentaria 35 saltos à primeira
carga de qualquer imagem que tivesse sido compartilhada.

## 11. Sem formulário de contato

A página de contato tem WhatsApp e Instagram, os dois canais verificados. Não
tem `<form>`.

Um formulário sem backend que "envia" e mostra sucesso é mentira para o
visitante. Um formulário que mostra erro depois de postar é pior. Como não há
serviço de formulário no escopo, a resposta honesta é canal direto, com
mensagem contextual por rota.

## 12. Adaptador de analytics desligado

`src/lib/analytics.ts` define os quatro eventos de intenção
(`whatsapp_click`, `phone_click`, `instagram_click`, `service_view`) e o
mapeamento rota → serviço. Sem `PUBLIC_ANALYTICS_ID`, o comportamento é
apenas `console.info`; nada sai do navegador, nenhum identificador é
inventado, nenhum tracker é instalado.

Ativar exige uma alteração de código deliberada em `Base.astro`, não uma
variável de ambiente. Assim ninguém ativa rastreamento por acidente.

## 13. Sem alarde de resultado

Nenhum arquivo do projeto afirma aumento de ranking, posição, volume de busca,
CPC, dificuldade ou crescimento de clientes. A pesquisa original não trouxe
esses números, e o Keyword Tool não forneceu volume. Os relatórios se
limitam ao que foi medido, com o método e as condições ao lado.

Da mesma forma, `reports/performance.json` se declara medição de laboratório
com limitação de rede e CPU simuladas. Não é dado de campo e não é Core Web
Vitals real.

## 14. FAQ sem `FAQPage`

O FAQ é conteúdo visível em `<details>`/`<summary>` nativos, que funciona por
teclado e leitor de tela sem nenhum JavaScript. Nenhum markup `FAQPage` é
emitido, e um teste impede que apareça: a documentação do Google registra que o
rich result de FAQ deixou de aparecer em 2026.

## 15. Textos em português, rotas antigas em inglês

`/about/`, `/projects/` e `/contact/` mantêm o caminho porque existiam e
preservam a entrada. O conteúdo, os rótulos e a navegação são todos em
português. A URL `/concertos-e-manutencao-...` mantém a grafia antiga no
caminho — mudar custaria um redirecionamento sem ganho — enquanto todo texto
visível usa "consertos". Há um teste que reprova "concertos" em texto visível.

## 16. Uma correção que quebrou a fonte

Uma edição de arquivo via PowerShell round-trip destruiu os travessões e
caracteres acentuados de `src/data/site.ts`: o console deixou de exibir
`—` e `ã`. O arquivo foi reescrito inteiro pela ferramenta de escrita, que
preserva UTF-8, e a integridade passou a ser verificada: há uma varredura por
caracteres CJK e de substituição em todos os `.astro` e `.ts` de `src/`, e ela
encontrou quatro que eu havia deixado passar em três páginas.

Regra que ficou: **nunca editar conteúdo de arquivo com cmdlets do
PowerShell**; usar as ferramentas de arquivo. A busca e a substituição de conteúdo também devem ocorrer dentro do UTF-8.