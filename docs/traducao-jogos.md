# Tradução de descrições IGDB para pt-BR

Integração autorizada em 21/10/2026, após avaliação documental. Implementada localmente; credencial criada pelo proprietário e amostras reais salvas, com conferência local confirmada pelo proprietário em 21/10/2026. Nenhuma conta, plano pago, faturamento, Worker público ou deploy foi criado.

## Manutenção do modelo — 06/11/2026

Substituição preparada localmente do Qwen 3 pelo Gemma 4, devido à descontinuação
do modelo anterior em 20/11/2026. Três amostras sintéticas reais passaram pelo
adaptador (2,4–5,1 segundos), com consumo estimado de 20 neurons pelos tokens
informados. Não houve gravação no banco; a publicação da atualização está pendente.
A chamada usa `max_completion_tokens: 3072` e raciocínio explicitamente desativado,
preservando timeout, validações, orçamento diário e espera entre tentativas.
Traduções antigas continuam visíveis quando vinculadas ao original atual; uma
reconfirmação explícita pode atualizá-las para o novo modelo, sem varredura automática.

## Fluxo e segurança

- Adaptador nativo fetch, sem SDK/dependência nova. Endpoint fixo api.cloudflare.com e modelo fixo @cf/google/gemma-4-26b-a4b-it. Nenhuma entrada do visitante escolhe modelo, host ou prompt.
- Ativação explícita no servidor: CLIPZONE_TRANSLATION_ENABLED=true, CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_AI_TOKEN, somente em .env.server.local (ignorado pelo Git). O token deve ser restrito à conta e permissões Workers AI Read/Edit. O proprietário cria e salva a credencial; não enviá-la pelo chat. Permanecer em Workers Free, sem créditos pré-pagos/AI Gateway nem faturamento.
- Cadastro/confirmação por ID usa o fluxo IGDB existente. Após confirmar o registro, o serviço tenta traduzir sua descrição persistida. Jogos antigos podem ser reconfirmados no seletor para receber a tradução. Não há varredura, migração nem tradução em acesso à ficha. A atualização automática dos metadados IGDB não foi acrescentada.
- description e officialName permanecem originais. games/{id}.translation armazena texto pt-BR, locale, modelo, hash da fonte/nomes/versão, cópia da descrição e nome usados e data. A ficha só mostra a tradução se estiver vinculada ao original e nome atuais; permite expandir Ver descrição original e indica tradução automática.
- Título oficial não é traduzido. Ocorrências do título e aliases conhecidos são protegidas com marcadores aleatórios e restauradas exatamente; ausência/repetição do marcador invalida a resposta. Nomes desconhecidos no corpo dependem da fidelidade do modelo; não há garantia universal de preservação ou correção sem revisão. Texto externo é tratado como dado, sem ferramentas ou execução de instruções.
- Texto fonte limitado a 8.000 caracteres, conteúdo protegido a 16.000 e 100 marcadores. Resposta HTTP limitada a 100 KB, texto a 24.000 caracteres, sem tags HTML/blocos de código/controles proibidos. Rejeita resposta vazia, excessivamente curta, inalterada e marcadores danificados. Esses controles não comprovam qualidade semântica ou completude: amostra real ainda necessária.
- Chamada externa fora das transações Firestore. gameTranslations/{gameId} é privado: reserva com lease de 2 minutos, verificação de titularidade/hash/estado na conclusão. Concorrência normal produz uma chamada; interrupções após a chamada podem ocasionar nova tentativa ao expirar a reserva. Não se promete exatamente uma chamada em caso de falha do processo.
- Limite operacional de 20 tentativas globais/dia UTC em translationUsage/{dia}, e 3 tentativas por jogo/versão/dia; falha espera 1 hora antes de outra tentativa. O dia seguinte permite tentar novamente. Uma nova confirmação ou comando explícito dispara a tentativa; sem agendador/polling. Tentativas contam mesmo se o provedor falhar. Limites não consomem a cota de cinco vídeos nem são promessa de franquia disponível na conta Cloudflare.
- Timeout de inferência de 12 segundos, sem repetição automática na mesma chamada; saída máxima 3.072 tokens. Confirmação do catálogo no cliente aguarda até 45 segundos, incluindo a consulta IGDB e tradução opcional. Falha na tradução não desfaz o cadastro: a ficha mantém o original. Desativação preserva traduções já salvas, sem novas chamadas.
- Coleções privadas reutilizam o Firestore existente; regras públicas inalteradas negam leitura/escrita direta, inclusive claims admin. Nenhum novo banco, índice ou endpoint de tradução público foi necessário. Não enviar dados de visitantes, tokens ou emails ao modelo. Erros privados são genéricos, sem corpo do provedor em logs.
- Aproximadamente 5 leituras e 4 gravações Firestore por tentativa concluída, além do cadastro existente; acerto no cache exige apenas leitura do jogo. Falhas/concorrência podem adicionar operações. Não há custo por visita referente à inferência. Respeitar as cotas gratuitas Firestore e Workers AI da conta inteira.

## Configuração e teste pelo proprietário

Abrir https://dash.cloudflare.com/?to=/:account/ai/workers-ai , selecionar a conta e usar Use REST API / Create a Workers AI API Token. Conferir Read/Edit apenas para Workers AI e apenas nessa conta. Revisar pessoalmente eventuais termos. Se exigir pagamento/cartão, interromper e informar; não fazer upgrade.

No arquivo privado .env.server.local:

    CLOUDFLARE_ACCOUNT_ID=seu_account_id
    CLOUDFLARE_AI_TOKEN=seu_token
    CLIPZONE_TRANSLATION_ENABLED=true

Depois de salvar, reiniciar a API local. Para avaliação explícita de um jogo já cadastrado no emulador:

    node --env-file=.env.server.local scripts/check-translation.mjs igdb-71
    node --env-file=.env.server.local scripts/check-translation.mjs igdb-9596

O comando usa somente demo-clipzone:8080 para dados e a API real Cloudflare para inferência. Imprime nome/descrição original/tradução, nunca credenciais. Não executar antes de o proprietário configurar a credencial. Atualizar as fichas no navegador; conferir naturalidade pt-BR, nomes, números, fidelidade, ausência de omissões e abertura do original. Não chamar tradução de pronta para produção antes desse aceite.

## Testes realizados

- tests/game-translation.test.mjs: 8 testes passaram com respostas controladas, cobrindo nomes (inclusive caracteres de regex), endpoint/modelo fixos, limites de resposta, concorrência, cache, descarte de fonte obsoleta, falhas, limites com retomada diária e compatibilidade do cadastro/ficha.
- Regressões: tests/game-confirmation.test.mjs (4), tests/game-catalog-client.test.mjs (3), tests/game-presentation.test.mjs (2) passaram. Não repetidas após ajustes exclusivamente internos ao servidor de tradução.
- tests/firestore/game-translation.test.mjs: 3 testes passaram no emulador isolado demo-clipzone-tests:8081. Concorrência real, orçamento global atômico, leitura pública pt-BR/original, regras privadas e descarte seguro de resultado obsoleto.
- 20 testes distintos relacionados aprovados. Lint e build completos passaram; após ajuste final no servidor, seus tipos/lint e os 8 testes relacionados foram novamente aprovados. Sintaxe dos dois scripts verificada. Sem suíte completa ou novo teste de fontes externas.
- Testes automatizados usam fixtures; amostra real posterior descrita abaixo. Não alegar fidelidade universal nem qualidade universal com base nas amostras.

## Arquivos deste ajuste

server/games/translate-description.ts; server/games/translation-store.ts; server/games/confirm-game.ts; server/http/game-confirmation.ts; server/http/public-api.ts; scripts/dev-api.mjs; scripts/check-translation.mjs; src/features/games/services/catalog-api.ts; src/features/games/services/game-details.ts; src/features/games/components/GameInfo.tsx; tests/game-translation.test.mjs; tests/firestore/game-translation.test.mjs; docs/traducao-jogos.md; docs/catalogo-jogos.md; docs/continuidade.md.

## Referências e condições

- https://developers.cloudflare.com/workers-ai/platform/pricing/ — usar somente plano/modelo gratuito; excesso no Free falha. Franquia compartilhada e sujeita a mudanças.
- https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/ — modelo e interface.
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/ — token e permissões.
- https://developers.cloudflare.com/workers-ai/platform/data-usage/ — uso de conteúdo e exceções de retenção.
- https://huggingface.co/Qwen/Qwen3-30B-A3B-FP8 — licença do modelo.

Sem rotina de TTL/limpeza criada para contadores e tarefas; retenção continua como requisito operacional anterior à produção. Não usar configuração local como implantação pronta.

## Amostra real — 21/10/2026

O proprietário criou e salvou a credencial. Executado scripts/check-translation.mjs para Portal (igdb-71) e Tibia (igdb-9596): duas versões por jogo, quatro chamadas reais no total, somente descrições públicas enviadas e resultados gravados em demo-clipzone:8080. Sem faturamento/deploy, original preservado. Primeira versão tinha termos inadequados e alteração de nome do dispositivo de Portal; ajustados glossário e proteção heurística de expressões compostas com iniciais maiúsculas, versão interna 2. Amostras atualizadas salvas; Portal preserva Aperture Science Handheld Portal Device. Tibia ainda contém construções literais e mantém North America/South America em inglês por proteção de nomes compostos. Isso demonstra a limitação de heurísticas: proprietário confirmou a conferência local e autorizou seguir; não afirmar fidelidade universal.

Ajuste da reserva: prazo bloqueia trabalho em andamento e falha da mesma fonte, mas não atrasa uma versão nova depois de trabalho concluído. Oito testes locais relacionados, tipos/lint do servidor e três testes transacionais no emulador novamente verificados após o ajuste. API local reiniciada com a configuração nova, sem reiniciar o Firestore de desenvolvimento; sessão administrativa precisa de nova verificação.

## 27/10/2026 — adaptacao Workers preparada, ativacao remota ainda pendente

Retorno9-A mostrou descricoes originais em ingles. A composicao local dev-api ja passava gameTranslation, mas a entrada Workers nao o conectava. Preparada conexao opt-in com CLIPZONE_TRANSLATION_ENABLED=true, CLOUDFLARE_ACCOUNT_ID e segredo CLOUDFLARE_AI_TOKEN, reutilizando adaptador e armazenamento existentes com20tentativas/dia e sem traducao ao visitar ficha. Sem flag, nenhuma consulta AI. Configuracao habilitada invalida recusa; chaves/configuracao ficam privadas. Quatro testes novos de composicao aprovados; suite completa757/0, tipos/lint e compilacao Workers aprovados. Nenhum token AI real lido, inferencia remota, flag/binding remoto ou deploy. Detalhes, limites de Free/neurons e passos para jogos existentes em etapa-9-a-retorno-correcoes.md. A integracao publicada ainda precisa de configuracao e homologacao explicitamente aprovadas.

## 27/10/2026 — ativação de tradução autorizada e publicada

O proprietário aprovou especificamente configurar o token AI existente e publicar o pacote de tradução somente na homologação; escolheu Tibia para a primeira conferência. Painel Cloudflare confirmou Workers Free e 0/10.000 neurons hoje; verificação oficial do token retornou ativo na mesma conta. Isso não certifica permissão de inferência até a chamada legítima. Nenhuma nova credencial ou plano criado.

Publicado Worker `8c3d7514-851f-4e76-bebc-782387a5c339`, anterior `42c847fa-f9c8-4497-9e9c-c4d0f16e6de9` registrado para eventual rollback. Os 43 arquivos estáticos foram preservados; hashes dos 42 públicos e 13 contratos remotos aprovados. Nomes dos nove segredos conferidos, preservando oito valores anteriores e acrescentando somente CLOUDFLARE_AI_TOKEN. Novo arquivo privado fora do Git com ACL usuário/SYSTEM; arquivo antigo e ambiente local intactos. Duas preparações interromperam antes de gravar segredos/deploy por incompatibilidade do módulo ACL do PowerShell antigo; resolvido usando PowerShell atual instalado, sem relaxar a proteção. Arquivos vazios dessas tentativas não contêm credenciais.

Tradução habilitada; ranking, jobs e diagnósticos false; nenhum trigger. Nenhuma inferência ou escrita editorial foi feita pelo agente nesta publicação. Reconfirmação de Tibia pelo proprietário combinada durante coleta de CPU; resultado e qualidade ainda pendentes. Não traduzir lote de jogos por inferência.

Operação futura: o Worker agora tem **nove** segredos. Usar o pacote privado de segredos atualizado registrado no manifesto operacional fora do Git; não reutilizar cegamente os runners antigos que exigem oito ou a configuração versionada com flags desligadas. Não anexar o arquivo privado ao Git. A primeira geração e recorrência do ranking permanecem pendentes e não foram autorizadas por este deploy de tradução.

## Tibia — tentativa única e incompatibilidade de resposta

O proprietário informou que a ficha continuava em inglês. A primeira janela registrou 20 eventos de navegação, sem pesquisa/confirm; leitura pontual mostrou Tibia IGDB ativo, descrição de 340 caracteres, sem tarefa e zero tentativas no dia. Em seguida, o agente realizou a confirmação única do Tibia exato na pesquisa oficial, dentro da homologação autorizada, sem publicar vídeo ou criar outro jogo. A tarefa terminou failed/attempts=1; original preservado e retryAt 2026-10-27T06:00:43.188Z (03:00:43 de Brasília; nova tentativa somente a partir de 03h01). Nenhum reset de contador, espera ou fonte foi aplicado.

A segunda janela confirmou pesquisa HTTP200/7ms CPU e confirmação HTTP200/19ms CPU, sem exceção/exceededCpu. HTTP200 de confirmação não prova sucesso da tradução opcional. O pico de 19ms ainda exige investigação e não aprova CPU para produção; amostra única, sem comprovação de inicialização fria para a tradução. Nenhuma suspensão/configuração automática foi aplicada. Painel Workers AI após a tentativa mostrou 7,67 neurons usados de 10.000; total observado, não atribuição contábil independente por chamada.

Consulta somente de leitura ao esquema oficial do mesmo modelo confirmou saída chat.completion em choices[].message.content. O adaptador publicado só lia result.response. Incompatibilidade confirmada e causa provável da falha, sem certeza retrospectiva da resposta descartada, que não foi armazenada. Catálogo do modelo acessível HTTP200; detalhes administrativos do próprio token retornaram403 (permissão de gestão), o que não demonstra falta de permissão AI ou ausência de restrições de IP. Nenhuma permissão foi alterada.

Correção local aceita tanto o formato legado quanto uma única conclusão de chat finalizada com stop, índice0 e papel assistant. Rejeita formatos mistos, múltiplas escolhas, truncamento, ferramentas e recusa. Ignora reasoning_content sem armazená-lo; mantém validações de nomes, tamanho, HTML, hash/cache e limites existentes. Três testes novos e suíte completa767/0/0, tipos/lint e dry-run aprovados. Bundle congelado 1131ea10d188c56de63f8165945b791c7775d9c2b415c2e609cf847175fc47a8, mesmos43assets e nove segredos. Ainda não publicado: aguarda aprovação específica do pacote corrigido; após publicar, repetir apenas uma tentativa legítima de Tibia depois do cooldown e coletar CPU. Não alegar tradução resolvida antes disso.

Ranking continua desligado, sem primeira geração ou cron. Spark confirmado no painel atualizado: pico de sete dias de891 gravações e cerca de4,6mil leituras; não é contador instantâneo de saldo. TikTok permanece pendente.

## Protocolo corrigido publicado; próxima tentativa respeita a espera

O proprietário autorizou especificamente o pacote corrigido e uma tentativa adicional única após 03h01 de Brasília. Publicado Worker `d26c55de-ff11-47ef-8fca-1841a6a6e526`, anterior `8c3d7514-851f-4e76-bebc-782387a5c339`, bundle `1131ea10d188c56de63f8165945b791c7775d9c2b415c2e609cf847175fc47a8`. Hashes dos42arquivos públicos e13contratos aprovados; mesma configuração de43assets, nove valores de segredo preservados, ACL do arquivo privado conferida e intacta. Tradução permanece ligada, ranking/jobs/diagnósticos desligados e nenhum trigger. Nenhuma nova inferência foi feita neste deploy.

Esclarecido: a tentativa anterior falhou às02:00:43, e o cooldown de1hora da mesma fonte libera03:00:43 (06:00:43UTC);03h01 é apenas arredondamento com margem, não mudança na regra nem uma restrição de horário do provedor. A nova tentativa deve conferir o retryAt real antes do clique e não ser repetida se já houver tradução pronta/tarefa running/segunda tentativa.

A criação de uma retomada automática única do chat para03h01 foi rejeitada pela revisão automática, que considerou ausente autorização específica para agendamento automático com escrita futura no Firestore. Nenhuma automação foi criada e nenhum contorno executado. Solicitada escolha explícita entre essa retomada automática e retorno manual. A aprovação da tentativa e seu limite de uma chamada adicional permanecem; a forma automática aguarda resposta. Nenhuma promessa de execução em segundo plano sem agendamento confirmado.

## 27/10/2026 — teste adicional autorizado concluído, ainda sem tradução

Proprietário retornou às03h04 e pediu executar o teste. Conferidos horário UTC06:04, Tibia IGDB ativo e uma falha anterior com espera já vencida; não havia recibo de retry anterior. Versão ativa d26c55de-ff11-47ef-8fca-1841a6a6e526 conferida pelo coletor. Criado recibo exclusivo antes de um único clique Confirmar este jogo na pesquisa oficial. Nenhum vídeo publicado, outro jogo criado, cron ou agendamento executado.

Tentativa terminou failed/attempts=2, original preservado e sem opção de original, confirmado na UI. Nova espera do servidor até 2026-10-27T07:06:08.812Z (04:06:08 de Brasília). Não efetuar terceira tentativa por inferência da autorização anterior; recibo marca doNotRepeat=true e limite adicional consumido, inclusive se o cartão de automação for ativado depois.

Coleta recebeu 15eventos; pesquisa4ms CPU, confirmação HTTP200/16ms CPU, leitura da ficha3ms. Nenhuma exceção/exceededCpu. O sample da confirmação foi de primeira rota no isolate, mas applicationCreated=false; não certificar cold start completo. Valor16ms continua acima do alvo10ms, e os valores19/16ms em tentativas distintas exigem investigação (não satisfazem necessariamente a definição anterior de recorrência quente na mesma instância). Sem suspensão ou deploy automático.

A correção do formato choices não resolveu sozinha. Não afirmar causa exata a partir de status HTTP200 da confirmação: o erro da tradução é absorvido para preservar o jogo e o código publicado guarda apenas failed. Preparado localmente um diagnóstico privado mínimo: código de falha em lista fixa e status HTTP do provedor quando conhecido, sem texto bruto, cabeçalhos, prompt, nomes de visitante, IP, chave ou erro arbitrário. Sem novo endpoint, relaxamento de validações, alteração de modelo ou de retry/budget. Duas regressões novas,17testes direcionados e suíte completa769/0/0, tipos/lint e dry-run aprovados. Bundle congelado cfa407fe09e0d6e371131d6aebc68b072addf0a6db1b099a316cd1a39c52411b, mesmos43assets e nove segredos. Diagnóstico ainda não publicado; nenhuma nova inferência foi executada para validá-lo.

O próximo pacote remoto exige aprovação específica; publicar o diagnóstico não significa autorizar outra tentativa de Tibia. Tradução, CPU, ranking e TikTok continuam com gates em aberto.

## 27/10/2026 — diagnóstico privado publicado, sem nova tentativa

Proprietário aprovou especificamente publicar somente o pacote de diagnóstico privado de falhas. Worker ativo em100%: `6910fddf-8d39-4129-a289-f60ce08be37c`; anterior `d26c55de-ff11-47ef-8fca-1841a6a6e526`; bundle `cfa407fe09e0d6e371131d6aebc68b072addf0a6db1b099a316cd1a39c52411b`. Mesmos43arquivos,42hashes públicos conferidos e13contratos remotos aprovados. Nove valores de segredo preservados; arquivo privado e sua ACL conferidos e intactos. Sem chamada AI, tentativa adicional, escrita editorial pelo agente, nova credencial, plano, cron ou lançamento público. Ranking/jobs continuam false. A flag de diagnósticos gerais do provedor continua false; o novo registro é somente código fixo/status HTTP na tarefa privada de tradução.

Falhas futuras poderão registrar failure.code e, quando conhecido, failure.providerStatus, sem resposta bruta, prompt, cabeçalhos, segredo ou mensagem arbitrária. Esse registro não recupera os motivos das duas falhas antigas. A tradução de Tibia e sua CPU continuam pendentes. O único retry autorizado já foi consumido; terceira inferência e agendamento não integram esta aprovação. Antes de qualquer próximo teste legítimo autorizado, conferir estado, orçamento e retryAt real; não reiniciar contadores ou reduzir a espera.
