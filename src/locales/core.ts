const pt = {
  slogan: "Zero desperdício. Tempo, dinheiro, energia e corpo no máximo.",
  heroTitle: "Seu assistente pessoal para tempo, dinheiro e corpo.",
  heroSub: "Converse com o Zero. Ele organiza sua agenda, controla seus gastos, calcula sua dieta — e lembra de tudo.",
  start: "Começar agora", signIn: "Entrar", signUp: "Criar conta", signOut: "Sair",
  pillarTime: "Tempo", pillarTimeD: "Prioridades claras, blocos de foco e nada esquecido.",
  pillarMoney: "Dinheiro", pillarMoneyD: "Gastos, orçamentos por categoria e alertas antes de estourar.",
  pillarBody: "Corpo", pillarBodyD: "Diga o que comeu e quanto: o Zero calcula calorias e macros.",
  nav: { chat: "Zero", dashboard: "Painel", time: "Tempo", money: "Dinheiro", diet: "Dieta", gym: "Academia" },
  email: "Email", password: "Senha", name: "Nome", forgot: "Esqueci a senha", google: "Continuar com Google", apple: "Continuar com Apple", or: "ou",
  checkEmail: "Confira seu email para confirmar a conta.", resetSent: "Enviamos um link para redefinir a senha.", newPassword: "Nova senha", save: "Salvar", noAccount: "Não tem conta?", haveAccount: "Já tem conta?",
  newChat: "Nova conversa", chatPlaceholder: "Fale com o Zero…", thinking: "Pensando…", emptyChat: "O que vamos otimizar hoje?", sharedMemory: "O Zero lembra de tudo o que importa sobre você.",
  suggestions: ["Planeje meu dia de amanhã", "Gastei 45 reais no almoço", "Comi 2 ovos e 1 pão francês", "Quanto gastei este mês?"],
  memory: "Memória", delete: "Excluir", add: "Adicionar", cancel: "Cancelar", today: "Hoje",
  tasks: "Tarefas", task: "Tarefa", due: "Prazo", minutes: "Minutos", priority: "Prioridade", high: "Alta", medium: "Média", low: "Baixa", pending: "Pendentes", done: "Concluídas", focusLoad: "Carga planejada",
  income: "Receita", expense: "Despesa", amount: "Valor", category: "Categoria", description: "Descrição", date: "Data", balance: "Saldo do mês", budgets: "Orçamentos", limit: "Limite mensal", spent: "Gasto",
  meals: "Refeições", meal: "Refeição", calories: "Calorias", protein: "Proteína", carbs: "Carboidratos", fat: "Gordura", mealType: "Tipo", breakfast: "Café da manhã", lunch: "Almoço", snack: "Lanche", dinner: "Jantar",
  workouts: "Fichas de treino", newWorkout: "Nova ficha", workoutName: "Nome da ficha", exercises: "Exercícios", searchExercise: "Buscar exercício (ex: bench press)", sets: "Séries", reps: "Repetições", rest: "Descanso (s)", weight: "Carga", addExercise: "Adicionar exercício", manualExercise: "Adicionar manualmente", noDemo: "Demonstrações indisponíveis: falta a chave da ExerciseDB.", demo: "Demonstração", open: "Abrir",
  mealInput: "O que você comeu e quanto? Ex: 150g de arroz, 1 filé de frango", calculating: "Calculando…", voice: "Falar", listening: "Ouvindo…", speakReplies: "Zero responde em voz",
  greeting: "Olá", overview: "Visão geral", empty: "Nada por aqui ainda.",
};

type Dict = typeof pt;

const en: Dict = {
  slogan: "Zero waste. Time, money, energy and body at their best.",
  heroTitle: "Your personal assistant for time, money and body.",
  heroSub: "Talk to Zero. It plans your schedule, tracks your spending, calculates your diet — and remembers everything.",
  start: "Get started", signIn: "Sign in", signUp: "Create account", signOut: "Sign out",
  pillarTime: "Time", pillarTimeD: "Clear priorities, focus blocks and nothing forgotten.",
  pillarMoney: "Money", pillarMoneyD: "Spending, category budgets and alerts before you overspend.",
  pillarBody: "Body", pillarBodyD: "Say what you ate and how much: Zero calculates calories and macros.",
  nav: { chat: "Zero", dashboard: "Dashboard", time: "Time", money: "Money", diet: "Diet", gym: "Gym" },
  email: "Email", password: "Password", name: "Name", forgot: "Forgot password", google: "Continue with Google", apple: "Continue with Apple", or: "or",
  checkEmail: "Check your email to confirm your account.", resetSent: "We sent you a reset link.", newPassword: "New password", save: "Save", noAccount: "No account?", haveAccount: "Already have an account?",
  newChat: "New chat", chatPlaceholder: "Talk to Zero…", thinking: "Thinking…", emptyChat: "What are we optimizing today?", sharedMemory: "Zero remembers everything that matters about you.",
  suggestions: ["Plan my day tomorrow", "I spent $12 on lunch", "I ate 2 eggs and a slice of toast", "How much did I spend this month?"],
  memory: "Memory", delete: "Delete", add: "Add", cancel: "Cancel", today: "Today",
  tasks: "Tasks", task: "Task", due: "Due", minutes: "Minutes", priority: "Priority", high: "High", medium: "Medium", low: "Low", pending: "Pending", done: "Done", focusLoad: "Planned load",
  income: "Income", expense: "Expense", amount: "Amount", category: "Category", description: "Description", date: "Date", balance: "Month balance", budgets: "Budgets", limit: "Monthly limit", spent: "Spent",
  meals: "Meals", meal: "Meal", calories: "Calories", protein: "Protein", carbs: "Carbs", fat: "Fat", mealType: "Type", breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner",
  workouts: "Workout sheets", newWorkout: "New sheet", workoutName: "Sheet name", exercises: "Exercises", searchExercise: "Search exercise (e.g. bench press)", sets: "Sets", reps: "Reps", rest: "Rest (s)", weight: "Load", addExercise: "Add exercise", manualExercise: "Add manually", noDemo: "Demos unavailable: ExerciseDB key missing.", demo: "Demo", open: "Open",
  mealInput: "What did you eat and how much? e.g. 150g rice, 1 chicken breast", calculating: "Calculating…", voice: "Talk", listening: "Listening…", speakReplies: "Zero speaks replies",
  greeting: "Hi", overview: "Overview", empty: "Nothing here yet.",
};

const es: Dict = {
  ...en,
  slogan: "Cero desperdicio. Tiempo, dinero, energía y cuerpo al máximo.",
  heroTitle: "Tu asistente personal para tiempo, dinero y cuerpo.",
  heroSub: "Habla con Zero. Organiza tu agenda, controla tus gastos, calcula tu dieta — y lo recuerda todo.",
  start: "Empezar", signIn: "Entrar", signUp: "Crear cuenta", signOut: "Salir",
  pillarTime: "Tiempo", pillarTimeD: "Prioridades claras, bloques de foco y nada olvidado.",
  pillarMoney: "Dinero", pillarMoneyD: "Gastos, presupuestos por categoría y alertas.",
  pillarBody: "Cuerpo", pillarBodyD: "Di qué comiste y cuánto: Zero calcula calorías y macros.",
  nav: { chat: "Zero", dashboard: "Panel", time: "Tiempo", money: "Dinero", diet: "Dieta", gym: "Gimnasio" },
  email: "Correo", password: "Contraseña", name: "Nombre", forgot: "Olvidé mi contraseña", google: "Continuar con Google", apple: "Continuar con Apple", or: "o",
  checkEmail: "Revisa tu correo para confirmar la cuenta.", resetSent: "Te enviamos un enlace.", newPassword: "Nueva contraseña", save: "Guardar", noAccount: "¿No tienes cuenta?", haveAccount: "¿Ya tienes cuenta?",
  newChat: "Nueva conversación", chatPlaceholder: "Habla con Zero…", thinking: "Pensando…", emptyChat: "¿Qué optimizamos hoy?", sharedMemory: "Zero recuerda todo lo importante sobre ti.",
  suggestions: ["Planifica mi día de mañana", "Gasté 10 euros en el almuerzo", "Comí 2 huevos y una tostada", "¿Cuánto gasté este mes?"],
  memory: "Memoria", delete: "Eliminar", add: "Añadir", cancel: "Cancelar", today: "Hoy",
  tasks: "Tareas", task: "Tarea", due: "Fecha", minutes: "Minutos", priority: "Prioridad", high: "Alta", medium: "Media", low: "Baja", pending: "Pendientes", done: "Hechas", focusLoad: "Carga planificada",
  income: "Ingreso", expense: "Gasto", amount: "Monto", category: "Categoría", description: "Descripción", date: "Fecha", balance: "Saldo del mes", budgets: "Presupuestos", limit: "Límite mensual", spent: "Gastado",
  meals: "Comidas", meal: "Comida", calories: "Calorías", protein: "Proteína", carbs: "Carbohidratos", fat: "Grasa", mealType: "Tipo", breakfast: "Desayuno", lunch: "Almuerzo", snack: "Merienda", dinner: "Cena",
  workouts: "Rutinas", newWorkout: "Nueva rutina", workoutName: "Nombre", exercises: "Ejercicios", searchExercise: "Buscar ejercicio (ej: bench press)", sets: "Series", reps: "Repeticiones", rest: "Descanso (s)", weight: "Carga", addExercise: "Añadir ejercicio", manualExercise: "Añadir manualmente", noDemo: "Demostraciones no disponibles: falta la clave de ExerciseDB.", demo: "Demostración", open: "Abrir",
  mealInput: "¿Qué comiste y cuánto? Ej: 150g de arroz, 1 pechuga", calculating: "Calculando…", voice: "Hablar", listening: "Escuchando…", speakReplies: "Zero responde en voz",
  greeting: "Hola", overview: "Resumen", empty: "Nada aquí todavía.",
};

const fr: Dict = {
  ...en,
  slogan: "Zéro gaspillage. Temps, argent, énergie et corps au maximum.",
  heroTitle: "Votre assistant personnel pour le temps, l'argent et le corps.",
  heroSub: "Parlez à Zero. Il organise votre agenda, suit vos dépenses, construit votre diète et vous entraîne.",
  start: "Commencer", signIn: "Se connecter", signUp: "Créer un compte", signOut: "Déconnexion",
  pillarTime: "Temps", pillarMoney: "Argent", pillarBody: "Corps",
  nav: { chat: "Zero", dashboard: "Tableau", time: "Temps", money: "Argent", diet: "Diète", gym: "Salle" },
  password: "Mot de passe", name: "Nom", forgot: "Mot de passe oublié", google: "Continuer avec Google", apple: "Continuer avec Apple", or: "ou",
  newChat: "Nouvelle conversation", chatPlaceholder: "Parlez à Zero…", thinking: "Réflexion…", emptyChat: "Qu'optimisons-nous aujourd'hui ?",
  tasks: "Tâches", income: "Revenu", expense: "Dépense", amount: "Montant", meals: "Repas", workouts: "Programmes", exercises: "Exercices", add: "Ajouter", delete: "Supprimer", save: "Enregistrer", cancel: "Annuler", today: "Aujourd'hui", greeting: "Bonjour",
};

const de: Dict = {
  ...en,
  slogan: "Null Verschwendung. Zeit, Geld, Energie und Körper auf Maximum.",
  heroTitle: "Dein persönlicher Assistent für Zeit, Geld und Körper.",
  heroSub: "Sprich mit Zero. Er plant deinen Tag, verfolgt Ausgaben, erstellt deine Ernährung und trainiert dich.",
  start: "Loslegen", signIn: "Anmelden", signUp: "Konto erstellen", signOut: "Abmelden",
  pillarTime: "Zeit", pillarMoney: "Geld", pillarBody: "Körper",
  nav: { chat: "Zero", dashboard: "Übersicht", time: "Zeit", money: "Geld", diet: "Ernährung", gym: "Training" },
  password: "Passwort", forgot: "Passwort vergessen", google: "Weiter mit Google", apple: "Weiter mit Apple", or: "oder",
  newChat: "Neuer Chat", chatPlaceholder: "Sprich mit Zero…", thinking: "Denke nach…", emptyChat: "Was optimieren wir heute?",
  tasks: "Aufgaben", income: "Einnahme", expense: "Ausgabe", amount: "Betrag", meals: "Mahlzeiten", workouts: "Trainingspläne", exercises: "Übungen", add: "Hinzufügen", delete: "Löschen", save: "Speichern", cancel: "Abbrechen", today: "Heute", greeting: "Hallo",
};

const it: Dict = {
  ...en,
  slogan: "Zero sprechi. Tempo, denaro, energia e corpo al massimo.",
  heroTitle: "Il tuo assistente personale per tempo, denaro e corpo.",
  heroSub: "Parla con Zero. Organizza l'agenda, controlla le spese, crea la dieta e ti allena.",
  start: "Inizia ora", signIn: "Accedi", signUp: "Crea account", signOut: "Esci",
  pillarTime: "Tempo", pillarMoney: "Denaro", pillarBody: "Corpo",
  nav: { chat: "Zero", dashboard: "Pannello", time: "Tempo", money: "Denaro", diet: "Dieta", gym: "Palestra" },
  forgot: "Password dimenticata", google: "Continua con Google", apple: "Continua con Apple", or: "o",
  newChat: "Nuova chat", chatPlaceholder: "Parla con Zero…", thinking: "Sto pensando…", emptyChat: "Cosa ottimizziamo oggi?",
  tasks: "Attività", income: "Entrata", expense: "Spesa", amount: "Importo", meals: "Pasti", workouts: "Schede", exercises: "Esercizi", add: "Aggiungi", delete: "Elimina", save: "Salva", cancel: "Annulla", today: "Oggi", greeting: "Ciao",
};

export default { pt, en, es, fr, de, it };
