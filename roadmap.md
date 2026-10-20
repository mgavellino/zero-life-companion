# Zero — roadmap
- [x] Repair database-backed continuous chat history: retain user messages and assistant replies after navigation and reload; follow-up recall verified
- [x] Show saved expense confirmations with amount, category and date in chat and money entry; actual capture/chat persistence verified
- [x] Teach installation through Chrome and Safari with an accessible install action
- [x] Optimize mobile/tablet navigation and chat; remove oversized content; expose every option through menu and visible More shortcut
- [ ] Improve real chat using landing conversation reference and smooth voice animation
- [ ] Publicar no Vercel — deploy em https://assistentezero.vercel.app funcionando (site, login por e-mail e dados); bloqueado no endereço da Vercel: login Google/Apple (a tela de login social só existe no hospedamento da Lovable) e pagamentos/lembretes/agenda/push (chaves gerenciadas pela Lovable). Versão completa continua sendo a publicada pela Lovable
- [x] Make clock visible throughout the signed-in app
- [ ] Easier provider-free background push — investigate and configure where possible
- [x] Monthly bills, atomic payment status and deduplicated hourly due-date reminders; UI and database flow tested
- [x] Automatic categories across manual entry, quick capture and chat
- [x] Admin option only for authorized accounts; role grant/revoke tested with RLS
- [x] Hide empty metrics and projections in Tempo, Dieta and Dinheiro
- [x] Integrated clock, saved time tracking and daily category percentages
- [x] Explain isolation, managed daily backups and shared Groq quotas
- [x] Remove Word, Excel and document integrations from scope at user's request
- [x] Onboarding completo com medidas opcionais e consentimento de saúde
- [x] Atividades por texto e chat com estimativa por IA
- [x] Isolamento de contas e controles de privacidade (exportação, revisão, retirada de consentimento)
- [ ] Verify closed-app Web Push delivery on HTTPS with a real device; native push additionally requires Android/iOS configuration
- [ ] Versão nativa — depende de projeto nativo e contas das lojas; o atual é web
- [x] Auth: email/senha, Google, Apple (sem marca Lovable visível)
- [x] Tempo, Dinheiro
- [x] Tema claro/escuro + 6 idiomas
- [x] Slogan melhorado
- [x] IA grátis Groq
- [x] Remover Academia
- [x] Dieta automática: refeição + quantidade → IA calcula macros
- [x] Chat de voz (sem gateway Lovable: voz do navegador)
- [x] Chat único contínuo (sem lista de conversas)

## Fase SaaS
- [x] Trocar "Jarvis" por "assistente pessoal"
- [x] Voz ElevenLabs
- [x] IA mais interativa (sugestões rápidas, proatividade)
- [x] Notificações no app e no navegador aberto; envio com app fechado e e-mail continuam pendentes abaixo
- [x] Sistema de admin
- [x] Planos via Paddle (grátis + 3 planos, mensal/semestral/anual, teste grátis, ancoragem)
- [x] Página de apresentação mais bem planejada
- [x] Identidade visual mais trabalhada
- [x] Abrir o app direto no chat de voz
- [x] Teste grátis de 1 mês (30 dias)
- [x] Páginas públicas de Termos, Privacidade e Reembolso com nome legal, e-mail de contato e links na apresentação e nos planos
- [ ] Pagamentos reais — aguardam publicação, verificação do vendedor e aprovação da Paddle
- [ ] Notificações por e-mail (aguardando domínio próprio)
- [ ] Parcelamento no semestral/anual — bloqueado: Paddle não parcela assinaturas; requer outro provedor autorizado pelo usuário
- [x] Benefícios reais: relatórios + planejamento semanal (Max), modelo/memória por plano
- [x] Registro rápido de gastos estilo Tony (uma frase → vários lançamentos)
- [x] Admin: conceder/revogar planos, financeiro (receita, assinaturas)
- [ ] Integração Google Agenda por usuário — tela e envio prontos; aguardando cliente Google configurado no workspace
- [x] Corrigir chat não salvando histórico
- [x] Filtros no financeiro e na agenda (tempo)
- [x] Tempo vazio por padrão e hábitos diários
- [x] Gasto calórico e balanço energético
- [x] Metas e projeções financeiras
- [ ] Conexão bancária gratuita via Open Finance — bloqueada: nenhuma opção gratuita contínua em produção confirmada; provedores exigem contrato pago
- [x] Impedir conteúdo técnico e código visível no chat

## Pendente
- [x] Unidades de medida e moeda nas Configuracoes (peso, altura, distancia, relogio 12/24h, moeda)

## Novas tarefas (19/10)
- [ ] Primeira campanha de anúncios — objetivo: cadastros no teste grátis; público: global 6 idiomas; pesquisa de concorrentes salva; próximo: escolha do tipo de campanha
- [x] Consertar notificações: lembretes de tarefas pelo servidor + envio a cada minuto + teste que se autorrepara
- [x] Verificar isolamento entre contas (só existe 1 conta; Google e Apple com mesmo e-mail viram a mesma conta)

- [ ] Onboarding mais completa (aguardando detalhes do usuário)
- [ ] Admin mais completo e funcional (aguardando detalhes do usuário)
- [ ] Admin: criar cupons de desconto (Paddle)
- [ ] Admin: promoções/cartazes na tela inicial
