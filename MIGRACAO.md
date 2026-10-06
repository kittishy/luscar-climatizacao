# Mapa de migração

Aplicável ao servidor de produção do cliente. O arquivo é derivado de
`seo/mapa-urls.csv` e `seo/assets-publicados.csv`, que continuam sendo o
contrato.

**Nenhuma URL útil mudou de caminho.** As nove páginas antigas são regravadas
no mesmo endereço, o que significa **zero redirecionamentos** e zero risco de
laço. A migração é de conteúdo, não de endereço.

---

## 1. Páginas

| URL atual | Destino | Ação | Status |
|---|---|---|---|
| `/` | `/` | Regravar preservando URL | 200 |
| `/about/` | `/about/` | Regravar preservando URL | 200 |
| `/contact/` | `/contact/` | Regravar preservando URL | 200 |
| `/projects/` | `/projects/` | Regravar preservando URL | 200 |
| `/servicos-de-climatizacao-ar-condicionado-joinville/` | idem | Regravar preservando URL | 200 |
| `/instalacao-de-ar-condicionado-predios-joinville/` | idem | Regravar preservando URL | 200 |
| `/instalacao-ar-condicionado-predio-apartamento-alpinismo-joinville/` | idem | Regravar preservando URL | 200 |
| `/concertos-e-manutencao-ar-condicionado-joinville/` | idem | Regravar preservando URL | 200 |
| `/encanador-tubulacao-flexivel-pex-e-epex-joinville/` | idem | Regravar preservando URL | 200 |
| `/instalacao-ar-condicionado-joinville/` | idem | Página nova | 200 |
| `/limpeza-ar-condicionado-joinville/` | idem | Página nova | 200 |
| `/guias/instalacao-ar-condicionado-apartamento/` | idem | Página nova | 200 |
| `/guias/ar-condicionado-nao-gela/` | idem | Página nova | 200 |
| `/ola-mundo/` | — | **410 Gone** | 410 |
| `/pagina-exemplo/` | — | **410 Gone** | 410 |
| `/author/projetos/` | — | **410 Gone** | 410 |
| `/category/sem-categoria/` | — | **410 Gone** | 410 |

Os quatro 410 **não** redirecionam para a home. Sem Search Console não sabemos
se carregam backlinks, e converter um resto de template em "conteúdo" da página
inicial seria enganoso. Um 410 honesto preserva o registro e sinaliza que aquilo
não foi nunca conteúdo do negócio.

Nenhum dos quatro entra na navegação nem no sitemap. Um teste de contrato
reprova qualquer um deles aparecendo como link ou entrada de sitemap.

## 2. Recursos antigos

As **35 URLs** de `seo/assets-publicados.csv` são **servidas no caminho
original**, não redirecionadas. O gerador copia cada arquivo para
`public/wp-content/...` e `public/s/img/wp-content/...`, incluindo as variantes
de tamanho (`-768x1024`, `-768x576`, `-768x971`).

Servir no caminho antigo preserva links de entrada com **zero saltos** e risco
zero de laço. Uma alternativa seria 301 de cada arquivo para o derivado
moderno, mas isso acrescentia 35 saltos à primeira carga de qualquer imagem já
compartilhada, e o CSV dá preferência explícita a servir o original.

Fotografias retiradas do redesign **não** são desviadas para outra
fotografia. Devolvem 404, que é a resposta correta.

## 3. Configuração de servidor

### Build

```bash
npm ci
npm run build          # gera dist/ e vercel.json no modo configurado
```

### Modo de publicação

| Variável | Valores | Padrão |
|---|---|---|
| `SITE_MODE` | `preview` \| `production` | `preview` |
| `SITE_ORIGIN` | URL de origem, usada só no preview | `https://luscar-climatizacao.vercel.app` |
| `PUBLIC_ANALYTICS_ID` | ID real | vazio (adaptador desligado) |

```bash
# demonstração (padrão, seguro)
npm run build

# corte autorizado no domínio do cliente
SITE_MODE=production npm run build
```

O modo **nunca** é inferido. Não basta existir um build para virar indexável:
só `SITE_MODE=production` remove o `noindex`, aponta o canonical para o domínio
do cliente e popula o sitemap.

### Comportamento por modo

| | preview | production |
|---|---|---|
| `canonical` | própria origem | `https://luscarjoinville.com.br` |
| `<meta name="robots">` | `noindex, follow` | `index, follow, max-image-preview:large` |
| `X-Robots-Tag` | `noindex, follow` | `index, follow` |
| `sitemap.xml` | **vazio** | 13 URLs |
| `robots.txt` | `Allow: /` | `Allow: /` + sitemap |

O preview **permite** a leitura em vez de bloquear. Um crawler impedido não
consegue ler o `noindex` que deveria obedecer; o bloqueio correto é o
cabeçalho `X-Robots-Tag`, que deixa ler e desaconselha indexar.

## 4. Particularidades por hospedagem

### Vercel

`vercel.json` é **gerado** por `npm run config` a partir do modo, para que
cabeçalhos e status não possam divergir do que o build fez. Contém:

- 4 rotas com `status: 410`
- `X-Robots-Tag` e cabeçalhos de segurança conforme o modo
- `Cache-Control: immutable` em `/media/(.*)`
- `outputDirectory: dist`, `trailingSlash: true`, `cleanUrls: false`

**Não existe regra `rewrites` de catch-all.** É essa ausência que garante que
um caminho desconhecido responda 404 em vez de virar a home com status 200.

```bash
vercel deploy --prod          # demonstração
```

### Nginx

Sem suporte a cabeçalhos condicionais por ambiente, use dois arquivos:

```nginx
# demonstração
add_header X-Robots-Tag "noindex, follow" always;

# producao - remova a linha acima e sirva:
# add_header X-Robots-Tag "index, follow" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;

location /media/ { add_header Cache-Control "public, max-age=31536000, immutable"; }

error_page 404 /404.html;      # status 404 real preservado
```

Para os quatro 410, `try_files`:

```nginx
location ~ ^/(ola-mundo|pagina-exemplo)/ { return 410; }
location ~ ^/(author|category)/ { return 410; }
```

### Apache

```apache
RedirectMatch 410 ^/(ola-mundo|pagina-exemplo)/$
RedirectMatch 410 ^/(author|category)/
ErrorDocument 404 /404.html
```

### Cloudflare

Regra de resposta para os quatro caminhos: **410 Gone**. Não "Redirect Rule"
para a home.

## 5. Checklist de corte

Só executar com autorização da responsável pela entrega.

1. Build de produção e conferência de `canonical`, `robots`, sitemap e
   `vercel.json` gerado.
2. Verificar que o domínio responde com o novo conteúdo.
3. Preservar ou verificar a propriedade do Search Console e **guardar a linha de
   base** de consultas e páginas antes de mudar.
4. Enviar o sitemap.
5. Inspecionar as 13 URLs e as quatro de 410.
6. Acompanhar cobertura e erros de rastreamento nas semanas seguintes.
7. Comparar 28 dias antes e depois. Mudança de conteúdo leva semanas e a
   posição oscila; **nenhum aumento de ranking é prometido por este mapa**.

## 6. Não fazer

- Não alterar DNS, WordPress ativo, Search Console ou Perfil da Empresa para
  montar a demonstração.
- Não redirecionar os quatro restos de template para a home.
- Não usar JavaScript nem meta refresh como migração.
- Não mudar domínio, conteúdo e todas as URLs ao mesmo tempo.
- Não declarar que este trabalho aumentou ranking, visitas ou clientes.