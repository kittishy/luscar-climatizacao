# Limitações e omissões

Documento interno. **Não é servido pelo site.**

O briefing pede que, diante de algo ausente, se implemente a opção honesta, se
omite a alegação e se registre a limitação. Este é o registro.

---

## 1. Campos deliberadamente não renderizados

Nenhum destes aparece em qualquer página, em qualquer schema, em qualquer
metadado. Um teste de contrato reprova a reintrodução de campos de contato
falsos no código-fonte.

| Campo | Situação | Decisão |
|---|---|---|
| Endereço físico | Nunca confirmado | Omitido. O site diz "Atendimento em Joinville/SC e região" |
| E-mail comercial | Nunca confirmado | Omitido |
| CNPJ | Nunca confirmado | Omitido |
| Horário de funcionamento | Nunca confirmado | Omitido |
| Nota / avaliação média | Nunca confirmado | Omitido. Sem `aggregateRating` |
| Número de clientes | Nunca confirmado | Omitido |
| Anos de experiência | Autodeclaração antiga sem escopo | Omitido |
| Garantia | Autodeclaração antiga sem escopo | Omitido |
| Preço / tabela | Inexistente | Omitido. Sem `priceRange`, sem `offers` |
| Certificação NR-35 | Destaque de Instagram não prova certificação vigente | Omitido |
| Assistência autorizada | Fotografia de aparelho de marca não prova vínculo | Omitido |
| Marcas parceiras | Menções em bio sem aprofundamento contratual | Omitido |
| Atendimento 24 h | Inexistente | Omitido |
| Mapa / geolocalização | Sem endereço real | Omitido |
| `PostalAddress`, `geo`, `openingHours` no schema | Derivariam de dados não confirmados | Omitidos, e o teste bloqueia |

## 2. Dados falsos que existiam e foram removidos

`/contact/` do site atual continha:

- `123 Fifth Avenue, NY 10160`
- `contact@example.com`
- `800-123-456`

São resíduo de template, não contatos da Luscar. **Não foram preservados
"porque estavam publicados".** A página de contato foi reescrita com os dois
canais verificados. Um teste reprova a presença de qualquer um desses
literais em qualquer HTML construído.

`/about/` continha "Who We Are?", "Our Mission" e Lorem ipsum.
`/projects/` continha material de template de aventura. Ambos foram
substituídos por conteúdo próprio.

## 3. Afirmações que o texto novo evita

O site antigo declarava "mais de 10 anos de experiência" e "garantia de 1 ano".
São autodeclarações sem escopo ou validade conhecidos. O texto novo não depende
delas nem as reformula: a experiência é demonstrada pelas fotografias e pela
explicação do trabalho.

Também não são repetidos "principal referência", "total satisfação",
"livre de fungos e bactérias", economia garantida ou controle de doenças.

## 4. Onde a fotografia impõe limite ao texto

- **Sem antes/depois.** Nenhuma imagem do acervo é um par comparativo, então
  nenhuma página apresenta um.
- **Sem identificação.** As legendas descrevem o que é visível. Nenhuma diz
  cliente, endereço, obra ou data, porque nada disso foi confirmado para estas
  fotografias — o manifesto declara isso explicitamente para os 13 arquivos.
- **Sem prova de autoria em PEX.** Os três arquivos PEX têm 295×172 px e são
  ilustrações do acervo. Aparecem em módulo técnico pequeno, com legenda
  dizendo o que são, e **não** contam como obra comprovada.
- **`instrumentos-em-servico.jpg` não vai para a galeria.** O rosto já está
  cortado pela borda esquerda na própria origem, então não pode ser o sujeito
  de uma peça larga. Vira detalhe pequeno.
- **A hero não é repetida na galeria.** Repetir a imagem da primeira tela
  dentro da galeria achataria a página num padrão de banco de imagens.

## 5. Limites técnicos registrados

- **PEX exige a frase de compatibilidade.** Nenhuma página afirma que PEX/EPEX
  serve a qualquer gás ou a qualquer circuito. A frase "a aplicação depende do
  sistema, das especificações do fabricante e da avaliação técnica" consta da
  página de PEX.
- **Sem tutorial de risco.** Nenhuma página ensina instalação elétrica,
  manuseio de fluido refrigerante ou trabalho em altura. O guia do aparelho que
  não gela manda parar de usar diante de cheiro de queimado, ruído anormal
  forte ou risco elétrico, e não ensina a abrir o equipamento.
- **Sem backend.** Não há formulário, porque não há serviço de formulário. A
  página de contato usa WhatsApp e Instagram.
- **Barlow Condensed não tem fonte variável** no endpoint oficial do Google
  Fonts. Segue com dois pesos estáticos.

## 6. O que ainda depende de acesso externo

Nenhuma destas etapas foi executada, e nenhuma delas bloqueia o código:

| Item | Situação | O que falta |
|---|---|---|
| Publicação da demonstração | Não realizada | Credencial Vercel autenticada nesta sessão |
| Corte do domínio do cliente | Não realizado | Autorização da responsável + acesso operacional |
| Search Console | Não acessado | Propriedade verificada |
| GA4 | Não configurado | ID real e consentimento |
| Medição de campo (Core Web Vitals) | Não realizada | tráfego real de usuários |
| Rank / posição | Não medido | Search Console |

O código, o build e os scripts de publicação estão prontos para todos esses
casos. O detalhamento está em `RELATORIO-VALIDACAO.md`.