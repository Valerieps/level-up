// Every user-facing text, in Brazilian Portuguese, in the app's voice (docs/GLOSSARIO.md has the
// terms). The UI imports from here; it never writes its own text.
export const strings = {
  appName: 'LevelUp',
  genericError: 'Algo deu errado. Tenta de novo?',
  retry: 'Tentar de novo',
  forbidden: 'Você não tem permissão para isso.',
  offline: 'Sem conexão. Mostrando o último estado carregado.',

  signIn: {
    tagline: 'Um app de hábitos que só registra o que você fez, reconhece quando um hábito virou automático e premia a coragem de subir a régua.',
    button: 'Entrar com Google',
    noInvite: 'Não há convite para esse e-mail. Peça a um admin para te convidar.',
    failed: 'O login não deu certo. Tenta de novo?',
    devTitle: 'Entrar sem Google (só para testes neste computador)',
    devEmail: 'E-mail',
    devName: 'Nome',
    devButton: 'Entrar para testar',
    devHint: 'Precisa de DEV_SIGN_IN=1 no .dev.vars. As mesmas regras de convite valem.',
    devOff: 'O login de teste está desligado. Ponha DEV_SIGN_IN=1 no .dev.vars e reinicie o servidor.',
  },

  nav: {
    main: 'Navegação principal',
    today: 'Hoje',
    shop: 'Loja',
    profile: 'Perfil',
    settings: 'Configurações',
    back: 'Voltar',
  },

  today: {
    title: 'Hoje',
    empty: 'Seus hábitos de hoje vão aparecer aqui.',
  },

  profile: {
    title: 'Perfil',
  },

  settings: {
    title: 'Configurações',
    day: 'Virada do dia',
    dayTurnoverLabel: 'Meu dia termina às',
    dayTurnoverHint: 'O que eu fizer antes desse horário ainda conta para o dia anterior.',
    hour: (hour: number) => (hour === 0 ? 'Meia-noite' : `${hour}h`),
    account: 'Conta',
    signOut: 'Sair',
    group: 'Grupo',
  },

  invites: {
    title: 'Convites',
    emailLabel: 'E-mail da conta Google',
    send: 'Convidar',
    revoke: 'Revogar',
    pending: 'Pendente',
    accepted: 'Aceito',
    revoked: 'Revogado',
    invalidEmail: 'Esse e-mail não parece certo.',
    alreadyMember: 'Essa pessoa já está no grupo.',
    empty: 'Nenhum convite ainda.',
  },

  members: {
    title: 'Membros',
    you: '(você)',
    admin: 'Admin',
    member: 'Membro',
    makeAdmin: 'Admin',
    rolesOf: (name: string) => `Papéis de ${name}`,
    lastAdmin: 'O grupo precisa de pelo menos um admin. Dê o papel a outra pessoa antes.',
    remove: 'Remover',
    removeOf: (name: string) => `Remover ${name} do grupo`,
    removeConfirm: (name: string) => `Remover ${name} do grupo? O acesso acaba na hora. Para voltar, é só convidar de novo.`,
    empty: 'Só você por aqui. Convide alguém!',
  },
} as const;
