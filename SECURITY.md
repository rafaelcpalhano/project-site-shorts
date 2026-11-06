# Segurança do Clipzone

Para relatar uma possível vulnerabilidade, envie uma descrição mínima para
**clipzone.suporte@gmail.com**. Evite publicar a falha em uma issue antes da revisão.
Não envie senhas, tokens, chaves privadas, códigos TOTP, cookies ou dados de terceiros.
Não há programa de recompensa ou prazo de resposta garantido.

O ambiente atual é de homologação. Publicação do site, visibilidade do código e
ativação de rotinas são decisões separadas. Não execute testes de carga ou ações
destrutivas contra o ambiente remoto.

## Antes de enviar código

- Execute `npm run security:check`, `npm run security:history` e `npm run security:audit`.
- Execute os testes, build e lint indicados no README.
- Mantenha credenciais, `.env` operacionais, `.dev.vars`, chaves e backups privados
  fora do Git. O `.gitignore` reduz acidentes; `git add -f` pode contorná-lo.
- Nunca coloque credenciais em variáveis `VITE_*`, comentários, mensagens de commit,
  issues, PRs, capturas, logs ou artefatos de CI.
- Project ID/App ID e configuração pública Firebase não concedem autorização.
  Chave YouTube de servidor, client secret Twitch/IGDB, token AI e chave privada da
  conta de serviço continuam privados.

O verificador local examina arquivos rastreados e novos não ignorados; o modo
histórico examina blobs alcançáveis e mensagens de commit. Ele não acessa provedores,
não verifica validade de credenciais e não imprime os valores encontrados.
É uma barreira por padrões conhecidos, não uma garantia de ausência de segredos:
formatos desconhecidos, imagens, arquivos ignorados, anexos e superfícies fora do
Git ainda precisam de revisão. Um alerta deve ser triado antes de publicar.

Se encontrar um segredo real, interrompa o envio e combine a resposta ao incidente.
Remover o arquivo atual não o remove do histórico. Não reescreva commits nem revogue
credenciais automaticamente; essas operações exigem decisão específica.

## Dependências de desenvolvimento

Há substituições transitivas em `package.json` associadas ao Firebase CLI:
`@google-cloud/pubsub → @opentelemetry/core@2.8.0` e `gaxios → uuid@11.1.1`.
Corrigem alertas em linhas antigas sem fazer downgrade do CLI. São mudanças de
versão principal nessas dependências transitivas e exigem os testes de
compatibilidade mantidos em `tests/security-toolchain.test.mjs` a cada revisão.
Não as copie para o runtime Workers ou remova sem nova análise.

Desde 06/11/2026, as faixas vulneráveis de `glob` (9 até 14.0.1) e
`minimatch` (7 até antes de 11.0.1) usam, respectivamente, 14.0.2 e 11.0.1
por overrides seletivos. As linhas antigas não afetadas de minimatch permanecem
intactas. Isso mantém as versões principais de ESLint e Firebase CLI, mas altera
versões principais transitivas: os testes de compatibilidade cobrem as APIs
utilizadas atualmente, não toda API antiga (como `Minimatch.makeRe`, removida).
Reavaliar essas regras quando as ferramentas adotarem as correções oficialmente;
não reduzir o nível da auditoria nem usar `npm audit fix --force` como atalho.

## Verificações no GitHub

O workflow de segurança usa permissões de leitura, ações oficiais fixadas por SHA,
Node24 e instalação com scripts desabilitados. Não recebe credenciais dos provedores,
não publica artefatos, não faz deploy e não usa `pull_request_target`.
O proprietário enviou o arquivo por push; a primeira execução foi aprovada.
O limite de tempo reduz consumo, mas não substitui a conferência da franquia de
Actions da conta. Não ativar faturamento ou recursos pagos para executar verificações.

Secret scanning, push protection, Dependabot e proteção de branches dependem de
configuração e disponibilidade do GitHub; este documento/workflow não os habilita.
Alterar visibilidade ou planos não faz parte de uma execução de testes.

Primeira execução GitHub verificada em 27/10/2026 no commit c1c1fbd: aprovada.
Ver o relatório e a evidência em docs/etapa-9-b5-ajustes-seguranca.md e
docs/evidencias/etapa-9-b5-github-actions.json. Este registro atualiza o estado
anterior de preparação local; não habilita controles nativos de segurança.
