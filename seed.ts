import "dotenv/config";
import dbConnect from "./lib/db";
import User, { IUser } from "./models/User";
import Session from "./models/Session";
import Course from "./models/Course";
import Notification from "./models/Notification";
import Quote from "./models/Quote";
import bcrypt from "bcryptjs";

declare var process: any;
declare var require: any;
declare var module: any;

async function seedDatabase() {
  try {
    await dbConnect();
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Session.deleteMany({});
    await Course.deleteMany({});
    await Notification.deleteMany({});
    await Quote.deleteMany({});
    console.log("🧹 Database cleared");

    const hashedPassword = await bcrypt.hash("password123", 10);
    const hashedPassword2 = await bcrypt.hash("Tristan2", 10);

    // Create users with subscription
    const users: IUser[] = await User.create([
      {
        email: "tristan.simon-derouard@comymedia.fr",
        name: "Tristan Simon-Derouard",
        role: "ADMIN",
        password: hashedPassword2,
        subscription: { isActive: true, plan: "gifted", activatedAt: new Date() },
        stats: { sessionsCompleted: 0 },
        lastActive: new Date(),
      },
      {
        email: "admin@coachymedia.fr",
        name: "Admin Principal",
        role: "ADMIN",
        password: hashedPassword,
        subscription: { isActive: true, plan: "yearly", activatedAt: new Date() },
        stats: { sessionsCompleted: 0 },
        lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
      {
        email: "coach1@coachymedia.fr",
        name: "Marie Dupont",
        role: "COACH",
        password: hashedPassword,
        subscription: { isActive: true, plan: "yearly", activatedAt: new Date() },
        coachProfile: { specialization: "Leadership", experience: 5 },
        stats: { sessionsCompleted: 15 },
      },
      {
        email: "manager@coachymedia.fr",
        name: "Jean Martin",
        role: "MANAGER",
        password: hashedPassword,
        subscription: { isActive: true, plan: "monthly", activatedAt: new Date() },
        stats: { sessionsCompleted: 8 },
      },
      {
        email: "coach2@coachymedia.fr",
        name: "Sophie Bernard",
        role: "COACH",
        password: hashedPassword,
        subscription: { isActive: true, plan: "monthly", activatedAt: new Date() },
        coachProfile: { specialization: "Communication", experience: 3 },
        stats: { sessionsCompleted: 12 },
      },
      // Active Students
      {
        email: "student1@coachymedia.fr",
        name: "Thomas Anderson",
        role: "USER",
        password: hashedPassword,
        subscription: { isActive: true, plan: "monthly", activatedAt: new Date() },
        stats: { sessionsCompleted: 2 },
        lastActive: new Date(),
        coursesProgress: [
          {
            courseId: "c1",
            completedLessonIds: [],
            progress: 0,
            score: 0,
            lastAccess: new Date(),
          },
        ],
      },
      {
        email: "student2@coachymedia.fr",
        name: "Sarah Connor",
        role: "USER",
        password: hashedPassword,
        subscription: { isActive: true, plan: "yearly", activatedAt: new Date() },
        stats: { sessionsCompleted: 5 },
        lastActive: new Date(),
        coursesProgress: [
          {
            courseId: "c1",
            completedLessonIds: [
              "l0-1", "l1-1", "l1-2", "q1",
              "l2-1", "l2-2", "q2",
              "l3-1", "l3-2", "l3-3", "q3",
              "l4-1", "l4-2", "q4",
              "l5-1", "l5-2", "q5",
              "l6-1", "l6-2", "q6"
            ],
            progress: 100,
            score: 95,
            lastAccess: new Date(),
          },
        ],
      },
      // Inactive subscription test user
      {
        email: "inactive@coachymedia.fr",
        name: "Lucas Scott",
        role: "USER",
        password: hashedPassword,
        subscription: { isActive: false, plan: "monthly", activatedAt: new Date() },
        stats: { sessionsCompleted: 0 },
        coursesProgress: [],
      },
    ] as any[]);

    console.log("👥 Users created");

    // Create Notifications
    await Notification.create([
      {
        id: "n1",
        title: "Nouveau contenu disponible",
        message: 'Le module "Gestion des émotions" est maintenant accessible.',
        date: "Il y a 2 heures",
        isRead: false,
        type: "success",
      },
      {
        id: "n2",
        title: "Rappel : Quiz à terminer",
        message:
          'N\'oubliez pas de compléter le quiz "Planifier prioriser" avant demain soir.',
        date: "Il y a 5 heures",
        isRead: false,
        type: "alert",
      },
      {
        id: "n3",
        title: "Bienvenue sur Coachymédia",
        message: "Commencez votre parcours d'apprentissage dès aujourd'hui !",
        date: "Il y a 2 jours",
        isRead: true,
        type: "info",
      },
    ]);
    console.log("🔔 Notifications created");

    // Create Courses
    await Course.create([
      {
        id: "c1",
        category: "Privé",
        title: "Gestion du temps et des priorités",
        progress: 0,
        modules: [
          {
            id: "m0",
            title: "Introduction et Présentation Générale",
            lessons: [
              {
                id: "l0-1",
                title: "Bienvenue",
                type: "LESSON",
                duration: "5 min",
                content: `
* « Je n’ai pas le temps !.. je n’ai plus le temps !.. Je manque de temps !.. Le temps passe vite ! » .. 

* Combien de fois avons-nous prononcé ce type de phrases ?  A la question, « comment vas-tu? », n’avez-vous pas de nombreuses fois entendu la réponse « ne m’en parle pas, je suis débordé! »… 

* Aujourd’hui, ce type d’échanges est fréquent et entame souvent une discussion en famille, entre amis ou collègues. 

* Nous sommes à l’ère de la surabondance marquée par trop d’activités, trop de compétitions, trop d’informations, trop de rythme/stress, …difficile de garder la tête hors de l’eau… 

* **86800 ?** Ce chiffre vous parle-t-il ? .. C’est le nombre de secondes à notre disposition dans une journée .. Un crédit renouvelé chaque matin mais la « source » s’épuise jour après jour.. 

* Notre objectif chez Coachymédia, c’est d’attirer votre attention et de vous apporter des outils pour ne plus gaspiller ces précieuses secondes inutilement !!! 

* Nous disposons tous de 24h par jour mais la différence, c’est ce que nous en faisons ! 

* Dans les différents modules de ce programme, il s’agit d’apprendre à bien investir le temps dont on dispose : l’expression « gestion du temps » est un non-sens.. On ne peut malheureusement prendre une heure ce jour pour la reporter à demain .. Mais nous pouvons gérer ce sur quoi on décide de porter notre attention !! 

* Coachymédia vous donnera une idée réaliste de ce que vous êtes capable d’accomplir et de ce qui vous prend le plus de temps, vous pourrez alors utiliser les astuces, les méthodes,… pour vous améliorer, changer vos habitudes et devenir plus performants. 

* Bienvenue dans l’aventure qui vous permettra de devenir un expert redoutablement efficace de la gestion du temps !!! 
`
              }
            ]
          },
          {
            id: "m1",
            title: "Module 1 : Définir des objectifs / Une stratégie",
            lessons: [
              {
                id: "l1-1",
                title: "Introduction et Concepts",
                type: "LESSON",
                duration: "5 min",
                content: `
* « Ce n’est pas que nous manquons de temps, c’est surtout que nous en perdons beaucoup » Socrate 

* Bienvenue dans ce programme. Apprendre à gérer ce sur quoi on porte notre attention OU « la gestion du temps, c’est apprendre à choisir plutôt que de subir » Patrick Leroux 

* Un objectif non défini dans le temps prend toujours du retard : la précipitation dans l'action fait finalement perdre du temps. 

* **Mise en pratique :** Faites preuve de patience. Prenez le temps nécessaire pour la réflexion. Préparez-vous. 

* Se fixer des objectifs c'est avant tout clarifier sa vision. Vous savez où vous voulez aller et à quelle vitesse. Cela vous permet de vous donner un cap ainsi qu'aux autres. 

* En négligeant la stratégie, on libère peu de temps tout en augmentant drastiquement ses chances d'échouer. 
`
              },
              {
                id: "l1-2",
                title: "Les Objectifs SMART",
                type: "LESSON",
                duration: "10 min",
                content: `
### Définition

* Un objectif est un rêve doté d’une échéance (Napoléon Hill). L’objectif est la clé de voûte de la gestion du temps (Marc Roussel). 

* George T. Doran donne naissance au concept SMART. Chaque objectif doit être **S**pécifique, **M**esurable, **A**tteignable, **R**éaliste et **T**emporellement défini. 

* **S - SPÉCIFIQUE :** Utilisez des verbes d’action, soyez précis. 

* **M - MESURABLE :** Utilisez des indicateurs faciles et précis. 

* **A - ATTEIGNABLE :** Possible, dans votre champ d’action. 

* **R - RÉALISTE :** En accord avec vos valeurs, objectifs à long terme. 

* **T - TEMPOREL :** Indiquez quand vous le ferez, délai précis. 

* La méthode SMART permet d'aligner et canaliser toutes les actions, maitriser le chrono et rester motivé. 

### Exercice

* *Exercice :* Prenez un objectif actuel dans votre entreprise et transformez-le en objectif SMART. 

* *Exemple :* "Je veux augmenter mon taux de transformation prospects en clients de 30% d'ici fin 2023 grâce à une formation CRM". 
`
              },
              {
                id: "q1",
                title: "Quiz Module 1",
                type: "QUIZ",
                duration: "5 min",
                questions: [
                  {
                    id: "q1-1",
                    question: "Quel est l’intérêt des objectifs SMART ?",
                    options: [
                      "Définir les détails d’un projet / Tenir les délais",
                      "Rendre les objectifs plus complexes",
                      "Ignorer les délais pour plus de qualité",
                      "Se concentrer uniquement sur le long terme"
                    ],
                    correctAnswerIndex: 0
                  },
                  {
                    id: "q1-2",
                    question: "Que signifie l’acronyme SMART ?",
                    options: [
                      "Super Magnifique Amusant Rapide Terrible",
                      "Spécifique Mesurable Atteignable Réaliste Temporel",
                      "Stratégique Moyen Abstrait Réel Total",
                      "Simple Mesuré Absolu Raisonnable Temporaire"
                    ],
                    correctAnswerIndex: 1
                  },
                  {
                    id: "q1-3",
                    question: "Quelle est la meilleure formule ?",
                    options: [
                      "Action – réflexion – objectifs",
                      "Objectifs – action – réflexion",
                      "Réflexion – objectifs – action",
                      "Action uniquement"
                    ],
                    correctAnswerIndex: 2
                  },
                  {
                    id: "q1-4",
                    question: "Que manque-t-il à l'objectif \"augmenter les ventes de 10% d'ici l'automne prochain\" ?",
                    options: [
                      "Il manque la partie Spécifique (de quoi ?) et Temporelle (date précise)",
                      "Il manque la partie Mesurable",
                      "Il est parfait",
                      "Il manque la partie Réaliste"
                    ],
                    correctAnswerIndex: 0
                  }
                ]
              }
            ]
          },
          {
            id: "m2",
            title: "Module 2 : Planifier & Prioriser",
            lessons: [
              {
                id: "l2-1",
                title: "Lois du temps",
                type: "LESSON",
                duration: "5 min",
                content: `
* **Loi de Murphy :** « Tout ce qui est susceptible d’aller mal, ira mal ». Rien ne se passe jamais comme prévu. Prévoyez une marge de manœuvre (environ 30 % du temps) pour les aléas. 

* **Loi de Parkinson :** « Plus on a du temps pour réaliser une tâche et plus cette tâche prendra du temps ». Lorsqu’on ne fixe pas de deadline, les choses s’éternisent. Solution : fixez des dates butoirs courtes mais réalistes. 

* « Si vous échouez la planification, vous planifiez l’échec. » Philip Kotler. 
`
              },
              {
                id: "l2-2",
                title: "La To-Do List",
                type: "LESSON",
                duration: "10 min",
                content: `
* Concentrez-vous toujours sur l’importance et non pas sur l’urgence. 

* La To Do List libère l’esprit, aide à se souvenir, permet de prioriser et aide à passer à l’action (cocher quand c’est fait). 

* **Conseils :**
* Choisissez votre support (papier, applis). 

* Verbe d’action + mission + temps/date. 

* Mélangez le pro et le perso pour alléger la charge mentale. 

* Mixez des missions faciles et difficiles. 

* Prévoir l’imprévu (45% du temps est souvent du non-prévu). 
`
              },
              {
                id: "q2",
                title: "Quiz Module 2",
                type: "QUIZ",
                duration: "5 min",
                questions: [
                  {
                    id: "q2-1",
                    question: "Quel est l'intérêt de définir une tâche dans le temps selon Parkinson ?",
                    options: [
                      "Pour limiter la durée d’exécution",
                      "Pour augmenter le stress",
                      "Pour faire durer le plaisir",
                      "Aucun intérêt"
                    ],
                    correctAnswerIndex: 0
                  },
                  {
                    id: "q2-2",
                    question: "Que recommande la loi de Murphy ?",
                    options: [
                      "De ne rien prévoir",
                      "Prévoir un temps tampon pour l’imprévu",
                      "D'être optimiste à 100%",
                      "De travailler plus vite"
                    ],
                    correctAnswerIndex: 1
                  },
                  {
                    id: "q2-3",
                    question: "Quel est le pourcentage de temps passé sur du non-prévu ?",
                    options: [
                      "10%",
                      "90%",
                      "Environ 45%",
                      "0%"
                    ],
                    correctAnswerIndex: 2
                  },
                  {
                    id: "q2-4",
                    question: "Quels sont les indispensables d'une to-do list ?",
                    options: [
                      "Uniquement les tâches urgentes",
                      "Une liste sans fin",
                      "Hiérarchiser et organiser vos tâches",
                      "Écrire le plus petit possible"
                    ],
                    correctAnswerIndex: 2
                  }
                ]
              }
            ]
          },
          {
            id: "m3",
            title: "Module 3 : Déléguer",
            lessons: [
              {
                id: "l3-1",
                title: "Principe de Pareto (20/80)",
                type: "LESSON",
                duration: "5 min",
                content: `
* 20 % de nos activités produisent 80 % du résultat. 

* Identifiez les « 20 % » qui ont le plus d’impact et déléguez l’accessoire. 

* Exemples : 80% des bénéfices viennent de 20% des clients. 
`
              },
              {
                id: "l3-2",
                title: "Obstacles à la délégation",
                type: "LESSON",
                duration: "10 min",
                content: `
**Messages contraignants (freins à la délégation)**

* Les messages intégrés dans l'enfance qui freinent la délégation :
* FAIS PLAISIR (« je vais le faire »). 

* SOIS PARFAIT (vérifier le travail des autres). 

* SOIS FORT (« je suis débordé mais je vais m’en occuper »). 

* FAIS DES EFFORTS. 

* DÉPÊCHE-TOI. 
`
              },
              {
                id: "l3-3",
                title: "La Matrice d'Eisenhower",
                type: "LESSON",
                duration: "10 min",
                content: `
* Outil pour prioriser (les "gros cailloux"). 

* Classification des tâches :
1. 
**Faire :** Urgent et Important. 

2. 
**Planifier :** Important mais Non Urgent. 

3. 
**Déléguer :** Urgent mais Non Important. 

4. 
**Éliminer :** Non Urgent et Non Important. 
`
              },
              {
                id: "q3",
                title: "Quiz Module 3",
                type: "QUIZ",
                duration: "5 min",
                questions: [
                  {
                    id: "q3-1",
                    question: "Quels sont les obstacles à la délégation ?",
                    options: [
                      "Le manque de personnel",
                      "Les messages contraignants, la peur que ce soit mal fait",
                      "Le coût financier",
                      "Aucun obstacle"
                    ],
                    correctAnswerIndex: 1
                  },
                  {
                    id: "q3-2",
                    question: "Que dit la règle de Pareto ?",
                    options: [
                      "50% d'efforts pour 50% de résultats",
                      "Tout est important",
                      "20% des activités génèrent 80% du résultat",
                      "Il faut tout déléguer"
                    ],
                    correctAnswerIndex: 2
                  },
                  {
                    id: "q3-3",
                    question: "Quelle est l'utilité de la matrice d'Eisenhower ?",
                    options: [
                      "Faire une belle liste",
                      "Différencier les tâches urgentes des tâches importantes",
                      "Classer par ordre alphabétique",
                      "Gérer les emails uniquement"
                    ],
                    correctAnswerIndex: 1
                  }
                ]
              }
            ]
          },
          {
            id: "m4",
            title: "Module 4 : Savoir dire Non",
            lessons: [
              {
                id: "l4-1",
                title: "Le concept & Les 6 étapes",
                type: "LESSON",
                duration: "10 min",
                content: `
* Savoir dire NON, c’est savoir dire OUI à ses priorités. 

* C’est une étape essentielle de l’affirmation de soi. 

**Les 6 étapes pour savoir dire non**

1. S’assurer que le refus est légitime. 

2. Travailler sur ses émotions (peur de ne plus faire carrière, peur d'être rejeté). 

3. Travailler sur ses croyances limitantes (ex: "le manager a toujours raison"). 

4. Prendre confiance en soi (commencer par des petits "non"). 

5. Bien exprimer son refus (utiliser la Communication Non Violente : Faits, Ressenti, Besoin, Demande). 

6. Accepter le "non" de l'autre ou sa réaction. 
`
              },
              {
                id: "l4-2",
                title: "Astuces pour se préserver",
                type: "LESSON",
                duration: "5 min",
                content: `
**Astuces pour se préserver**

* Couper les notifications, fermer sa porte, communiquer sur son indisponibilité. 

* Planifier des créneaux de 1h30 maximum pour une concentration efficace. 
`
              },
              {
                id: "q4",
                title: "Quiz Module 4",
                type: "QUIZ",
                duration: "5 min",
                questions: [
                  {
                    id: "q4-1",
                    question: "Quel est l'intérêt de savoir dire non ?",
                    options: [
                      "Être désagréable",
                      "Rester concentré sur ses priorités",
                      "Éviter le travail",
                      "Montrer son autorité"
                    ],
                    correctAnswerIndex: 1
                  },
                  {
                    id: "q4-2",
                    question: "Combien de temps faut-il pour se reconcentrer après une interruption ?",
                    options: [
                      "Instantané",
                      "1 minute",
                      "De 3 minutes à 20 minutes",
                      "1 heure"
                    ],
                    correctAnswerIndex: 2
                  },
                  {
                    id: "q4-3",
                    question: "Comment dire non efficacement ?",
                    options: [
                      "Ignorer la demande",
                      "Dire non sans explication",
                      "Communiquer sur son indisponibilité",
                      "Reporter indéfiniment"
                    ],
                    correctAnswerIndex: 2
                  }
                ]
              }
            ]
          },
          {
            id: "m5",
            title: "Module 5 : Combattre la Procrastination",
            lessons: [
              {
                id: "l5-1",
                title: "Comprendre la procrastination",
                type: "LESSON",
                duration: "5 min",
                content: `
**Comprendre la procrastination**

* Ce n'est pas de la paresse, c'est une stratégie de protection (peur de l'échec, perfectionnisme). 

* **Loi de Laborit :** L’individu cherche naturellement à éviter les tâches difficiles (fuite devant la douleur) pour privilégier le plaisir immédiat. 
`
              },
              {
                id: "l5-2",
                title: "Outil pour agir",
                type: "LESSON",
                duration: "10 min",
                content: `
**Outils pour agir**

* **Règle des 5 secondes (Mel Robbins) :** Comptez 5 – 4 – 3 – 2 – 1 et agissez immédiatement avant que le cerveau ne trouve des excuses. 

* **Méthode Pomodoro :** Travailler intensément 25 minutes, puis 5 minutes de pause. Répéter 4 fois puis prendre une pause longue (20 min). 

* Commencer la journée par le plus difficile (avaler le crapaud). 
`
              },
              {
                id: "q5",
                title: "Quiz Module 5",
                type: "QUIZ",
                duration: "5 min",
                questions: [
                  {
                    id: "q5-1",
                    question: "Quelles sont les causes de la procrastination ?",
                    options: [
                      "La fatigue uniquement",
                      "Distraction, perfectionnisme, peur de l’inconnu, etc.",
                      "Le manque de compétence",
                      "L'excès de travail"
                    ],
                    correctAnswerIndex: 1
                  },
                  {
                    id: "q5-2",
                    question: "Que dit la loi de Laborit ?",
                    options: [
                      "Il faut fuir le plaisir",
                      "Il faut rechercher la douleur",
                      "On fuit la difficulté / Il faut commencer par le difficile",
                      "Tout travail mérite salaire"
                    ],
                    correctAnswerIndex: 2
                  },
                  {
                    id: "q5-3",
                    question: "Quelle technique aide à passer à l'action immédiatement ?",
                    options: [
                      "La méthode des 5 minutes",
                      "La règle des 5 secondes",
                      "L'attente active",
                      "La sieste flash"
                    ],
                    correctAnswerIndex: 1
                  }
                ]
              }
            ]
          },
          {
            id: "m6",
            title: "Module 6 : Gérer ses niveaux d'énergie",
            lessons: [
              {
                id: "l6-1",
                title: "Concept & Les 4 types d'énergie",
                type: "LESSON",
                duration: "10 min",
                content: `
**Concept**

* Nous avons un temps limité et une énergie limitée. Il faut gérer les deux. 

* L'efficience passe par la prise en compte de ses rythmes biologiques (heures, saisons, sommeil). 

**Les 4 types d'énergie**

1. 
**Physique :** Sommeil, alimentation, mouvement. 

2. 
**Mentale/Intellectuelle :** Connaissances, exploration. 

3. 
**Émotionnelle :** Gestion du stress, lâcher prise. 

4. 
**Motivationnelle :** Ambitions, objectifs (la plus puissante mais elle use). 
`
              },
              {
                id: "l6-2",
                title: "Conseils pour alléger le cerveau",
                type: "LESSON",
                duration: "5 min",
                content: `
**Conseils pour alléger le cerveau**

* Notez tout sur un seul support. 

* Ne commencez pas la journée par vos emails. 

* Rangez (on perd 7h/semaine à chercher). 

* Dormez (le cerveau range et nettoie la nuit). 

* Acceptez de vous ennuyer. 
`
              },
              {
                id: "q6",
                title: "Quiz Module 6",
                type: "QUIZ",
                duration: "5 min",
                questions: [
                  {
                    id: "q6-1",
                    question: "Quels éléments biologiques influencent l'efficience ?",
                    options: [
                      "Uniquement l'alimentation",
                      "Heures, saisons, alimentation, ensoleillement",
                      "La température extérieure seulement",
                      "L'âge"
                    ],
                    correctAnswerIndex: 1
                  },
                  {
                    id: "q6-2",
                    question: "Quels sont les 4 types d'énergie ?",
                    options: [
                      "Eau, Terre, Feu, Air",
                      "Physique, nucléaire, éolienne, solaire",
                      "Physique, mentale, émotionnelle, motivationnelle",
                      "Positive, négative, neutre, absente"
                    ],
                    correctAnswerIndex: 2
                  },
                  {
                    id: "q6-3",
                    question: "Comment alléger notre cerveau ?",
                    options: [
                      "Travailler plus la nuit",
                      "Lister, dormir, ne pas lire ses mails en arrivant, ranger",
                      "Manger moins",
                      "Regarder la télévision"
                    ],
                    correctAnswerIndex: 1
                  }
                ]
              }
            ]
          },
        ]
      },
      {
        id: "c2",
        category: "Leadership",
        title: "Communication & Leadership",
        progress: 0,
        modules: [
          {
            id: "m2-1",
            title: "Les fondements du leadership",
            lessons: [
              {
                id: "l2-1-b",
                title: "Styles de leadership",
                type: "LESSON",
                duration: "10 min",
              },
              {
                id: "q2-1",
                title: "Quiz Leadership",
                type: "QUIZ",
                duration: "5 min",
                questions: [
                  {
                    id: "qq2-1",
                    question: "Quel style de leadership favorise l'autonomie ?",
                    options: ["Directif", "Délégatif", "Persuasif", "Participatif"],
                    correctAnswerIndex: 1
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);
    console.log("📚 Courses created");

    // Create sessions - including sessions for the last 7 days to populate the energy chart
    // Helper to create dates relative to today
    const today = new Date();
    const getDateAgo = (daysAgo: number, hour: number = 10) => {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(hour, 0, 0, 0);
      return date;
    };

    const sessions = await Session.create([
      // Historic session
      {
        coachId: (users[1]._id as any),
        attendees: [(users[2]._id as any)],
        startTime: new Date("2025-01-20T10:00:00"),
        endTime: new Date("2025-01-20T11:30:00"),
        duration: 90,
        status: "COMPLETED",
        videoUrl: "https://example.com/recording1",
        assessments: [
          {
            raterId: (users[1]._id as any),
            targetId: (users[2]._id as any),
            leadership: 8,
            communication: 7,
            adaptability: 9,
            emotionalInt: 8,
            comment: "Excellente progression sur les compétences de leadership",
          },
        ],
      },
      // Sessions for the last 7 days - For student1 (Thomas Anderson, users[4])
      {
        coachId: (users[1]._id as any),
        attendees: [(users[4]._id as any)],
        startTime: getDateAgo(6, 10),
        endTime: getDateAgo(6, 11),
        duration: 60,
        status: "COMPLETED",
        videoUrl: "https://example.com/session-day6",
        assessments: [
          {
            raterId: (users[1]._id as any),
            targetId: (users[4]._id as any),
            leadership: 6,
            communication: 7,
            adaptability: 6,
            emotionalInt: 7,
            comment: "Bonne première session, bases solides",
          },
        ],
      },
      {
        coachId: (users[1]._id as any),
        attendees: [(users[4]._id as any)],
        startTime: getDateAgo(5, 14),
        endTime: getDateAgo(5, 15),
        duration: 60,
        status: "COMPLETED",
        videoUrl: "https://example.com/session-day5",
        assessments: [
          {
            raterId: (users[1]._id as any),
            targetId: (users[4]._id as any),
            leadership: 7,
            communication: 7,
            adaptability: 7,
            emotionalInt: 6,
            comment: "Progression notable en leadership",
          },
        ],
      },
      {
        coachId: (users[1]._id as any),
        attendees: [(users[4]._id as any)],
        startTime: getDateAgo(4, 9),
        endTime: getDateAgo(4, 10),
        duration: 60,
        status: "COMPLETED",
        videoUrl: "https://example.com/session-day4",
        assessments: [
          {
            raterId: (users[1]._id as any),
            targetId: (users[4]._id as any),
            leadership: 8,
            communication: 8,
            adaptability: 7,
            emotionalInt: 8,
            comment: "Excellente session, bonne énergie",
          },
        ],
      },
      {
        coachId: (users[1]._id as any),
        attendees: [(users[4]._id as any)],
        startTime: getDateAgo(3, 11),
        endTime: getDateAgo(3, 12),
        duration: 60,
        status: "COMPLETED",
        videoUrl: "https://example.com/session-day3",
        assessments: [
          {
            raterId: (users[1]._id as any),
            targetId: (users[4]._id as any),
            leadership: 7,
            communication: 9,
            adaptability: 8,
            emotionalInt: 8,
            comment: "Communication en nette amélioration",
          },
        ],
      },
      {
        coachId: (users[1]._id as any),
        attendees: [(users[4]._id as any)],
        startTime: getDateAgo(2, 10),
        endTime: getDateAgo(2, 11),
        duration: 60,
        status: "COMPLETED",
        videoUrl: "https://example.com/session-day2",
        assessments: [
          {
            raterId: (users[1]._id as any),
            targetId: (users[4]._id as any),
            leadership: 8,
            communication: 8,
            adaptability: 9,
            emotionalInt: 7,
            comment: "Adaptabilité remarquable",
          },
        ],
      },
      {
        coachId: (users[1]._id as any),
        attendees: [(users[4]._id as any)],
        startTime: getDateAgo(1, 15),
        endTime: getDateAgo(1, 16),
        duration: 60,
        status: "COMPLETED",
        videoUrl: "https://example.com/session-day1",
        assessments: [
          {
            raterId: (users[1]._id as any),
            targetId: (users[4]._id as any),
            leadership: 9,
            communication: 8,
            adaptability: 8,
            emotionalInt: 9,
            comment: "Excellente progression globale",
          },
        ],
      },
      {
        coachId: (users[1]._id as any),
        attendees: [(users[4]._id as any)],
        startTime: getDateAgo(0, 9),
        endTime: getDateAgo(0, 10),
        duration: 60,
        status: "COMPLETED",
        videoUrl: "https://example.com/session-today",
        assessments: [
          {
            raterId: (users[1]._id as any),
            targetId: (users[4]._id as any),
            leadership: 9,
            communication: 9,
            adaptability: 9,
            emotionalInt: 8,
            comment: "Session optimale, très bonne dynamique",
          },
        ],
      },
      // Scheduled session for the future
      {
        coachId: (users[3]._id as any),
        attendees: [(users[0]._id as any), (users[1]._id as any)],
        startTime: new Date("2025-12-20T14:00:00"),
        endTime: new Date("2025-12-20T16:00:00"),
        duration: 120,
        status: "SCHEDULED",
        videoUrl: "",
      },
    ] as any[]);

    console.log("📅 Sessions created (including 7-day energy data)");

    // Create quotes
    await Quote.create([
      {
        text: "L'apprentissage est la seule chose que l'esprit n'épuise jamais, ne craint jamais et ne regrette jamais.",
        author: "Léonard de Vinci",
      },
      {
        text: "L'éducation est l'arme la plus puissante qu'on puisse utiliser pour changer le monde.",
        author: "Nelson Mandela",
      },
      {
        text: "Investir dans le savoir rapporte toujours les meilleurs intérêts.",
        author: "Benjamin Franklin",
      },
      {
        text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.",
        author: "Steve Jobs",
      },
      {
        text: "Le succès n'est pas la clé du bonheur. Le bonheur est la clé du succès. Si vous aimez ce que vous faites, vous réussirez.",
        author: "Albert Schweitzer",
      },
    ]);
    console.log("💬 Quotes created");

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Courses: ${await Course.countDocuments()}`);
    console.log(`   Sessions: ${await Session.countDocuments()}`);
    console.log(`   Quotes: ${await Quote.countDocuments()}`);

    console.log("\n🔗 API Explorer: http://localhost:3001/api-explorer");
    console.log("🚀 Server: http://localhost:3001");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  seedDatabase();
}
