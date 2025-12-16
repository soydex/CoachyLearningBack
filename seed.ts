import "dotenv/config";
import dbConnect from "./lib/db";
import Organization from "./models/Organization";
import User from "./models/User";
import Capsule from "./models/Capsule";
import Session from "./models/Session";
import Course from "./models/Course";
import Notification from "./models/Notification";
import bcrypt from "bcryptjs";

async function seedDatabase() {
  try {
    await dbConnect();
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await Organization.deleteMany({});
    await User.deleteMany({});
    await Capsule.deleteMany({});
    await Session.deleteMany({});
    await Course.deleteMany({});
    await Notification.deleteMany({});
    console.log("🧹 Database cleared");

    // Create organizations
    const org1 = await Organization.create({
      name: "Coach y Média",
      settings: { theme: "default", language: "fr" },
    });

    const org2 = await Organization.create({
      name: "Formation Plus",
      settings: { theme: "dark", language: "fr" },
    });

    console.log("🏢 Organizations created");

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create users
    const users = await User.create([
      {
        organizationId: org1._id,
        email: "admin@coachy-media.com",
        name: "Admin Principal",
        role: "ADMIN",
        password: hashedPassword,
        stats: { sessionsCompleted: 0 },
      },
      {
        organizationId: org1._id,
        email: "coach1@coachy-media.com",
        name: "Marie Dupont",
        role: "COACH",
        password: hashedPassword,
        coachProfile: { specialization: "Leadership", experience: 5 },
        stats: { sessionsCompleted: 15 },
      },
      {
        organizationId: org1._id,
        email: "manager@coachy-media.com",
        name: "Jean Martin",
        role: "MANAGER",
        password: hashedPassword,
        stats: { sessionsCompleted: 8 },
      },
      {
        organizationId: org2._id,
        email: "coach2@formation-plus.com",
        name: "Sophie Bernard",
        role: "COACH",
        password: hashedPassword,
        coachProfile: { specialization: "Communication", experience: 3 },
        stats: { sessionsCompleted: 12 },
      },
    ]);

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
        message: 'N\'oubliez pas de compléter le quiz "Planifier prioriser" avant demain soir.',
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

    // Create Course
    await Course.create({
      id: "c1",
      category: "Privé",
      title: "Gestion du temps et des priorités",
      progress: 0,
      modules: [
        {
          id: "m1",
          title: "Introduction & Bases",
          lessons: [
            {
              id: "l1",
              title: "Définir les objectifs",
              type: "LESSON",
              duration: "5 min",
            },
            {
              id: "l2",
              title: "Planifier prioriser",
              type: "LESSON",
              duration: "5 min",
            },
          ],
        },
        {
          id: "m2",
          title: "Organisation Quotidienne",
          lessons: [
            {
              id: "c1",
              title: "Introduction : planifier prioriser",
              type: "CHAPTER",
              duration: "2 min",
            },
            {
              id: "c2",
              title: "La to-do list",
              type: "CHAPTER",
              duration: "10 min",
            },
            {
              id: "c3",
              title: "Planifiez et priorisez vos tâches !",
              type: "CHAPTER",
              duration: "8 min",
            },
            {
              id: "q1",
              title: "Quiz Planifier prioriser",
              type: "QUIZ",
              duration: "5 min",
              questions: [
                {
                  id: "qq1",
                  question: "Quelle est la première étape pour une planification efficace ?",
                  options: [
                    "Commencer par les tâches les plus faciles",
                    "Lister toutes les tâches à accomplir",
                    "Faire une pause café",
                    "Déléguer tout immédiatement",
                  ],
                  correctAnswerIndex: 1,
                },
                {
                  id: "qq2",
                  question: "Selon la matrice d'Eisenhower, une tâche 'Importante mais non Urgente' doit être :",
                  options: [
                    "Fait immédiatement",
                    "Planifiée pour plus tard",
                    "Déléguée",
                    "Supprimée",
                  ],
                  correctAnswerIndex: 1,
                },
                {
                  id: "qq3",
                  question: "Quel est l'avantage principal d'une To-Do List ?",
                  options: [
                    "Décharger le cerveau et visualiser la charge de travail",
                    "Avoir l'air occupé au bureau",
                    "Utiliser beaucoup de papier",
                    "Aucun avantage réel",
                  ],
                  correctAnswerIndex: 0,
                },
              ],
            },
          ],
        },
        {
          id: "m3",
          title: "Efficacité Relationnelle",
          lessons: [
            {
              id: "l3",
              title: "Déléguer",
              type: "LESSON",
              duration: "6 min",
            },
            {
              id: "l4",
              title: "Savoir dire non",
              type: "LESSON",
              duration: "6 min",
            },
          ],
        },
        {
          id: "m4",
          title: "Gérer ses ressources",
          isOpen: true,
          lessons: [
            {
              id: "l5",
              title: "Combattre la procrastination",
              type: "LESSON",
              duration: "6 min",
            },
            {
              id: "l6",
              title: "Gérer ses niveaux d'énergie",
              type: "LESSON",
              duration: "5 min",
              steps: [
                { id: "s1", title: "Introduction : gérer ses niveaux d’énergie", isCompleted: false },
                { id: "s2", title: "Les 4 types d'énergie", isCompleted: false },
                { id: "s3", title: "L'efficience par le rythme biologique", isCompleted: false },
                { id: "s4", title: "Outil : alléger le cerveau", isCompleted: false },
              ],
              content: `<div class="space-y-8">
  <div class="border-l-4 border-brand-600 pl-6 py-2 bg-blue-50 rounded-r-lg">
    <h3 class="text-xl font-serif italic text-slate-700">
      « Mettre tout en équilibre, c’est bien. Mettre tout en harmonie, c’est mieux »
    </h3>
    <p class="mt-2 text-sm font-semibold text-slate-500">
      — Victor Hugo
    </p>
  </div>
  <div class="prose prose-slate max-w-none text-slate-600 leading-relaxed">
    <p>Si vous avez déjà eu à gérer plusieurs projets de front, vous avez sans doute vécu cette sensation de perte de contrôle et de manque d’énergie.</p>
    <p>On a tous tendance à vouloir toujours en faire plus… comme s’il s’agissait de prouver quelque chose…</p>
    <p class="font-medium text-slate-800">Or, il est capital de savoir se ménager et d’apprendre à connaître ses niveaux d’énergie pour être efficace sur la durée.</p>
  </div>
  <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <h4 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
      Rappel des modules précédents
    </h4>
    <p class="mb-4 text-slate-600">On a vu au cours des 5 premiers modules qu’une personne qui gère bien son temps sera capable de :</p>
    <ul class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <li class="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded border border-slate-100"><div class="w-1.5 h-1.5 rounded-full bg-brand-500"></div>se fixer des objectifs</li>
      <li class="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded border border-slate-100"><div class="w-1.5 h-1.5 rounded-full bg-brand-500"></div>prioriser</li>
      <li class="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded border border-slate-100"><div class="w-1.5 h-1.5 rounded-full bg-brand-500"></div>déléguer</li>
      <li class="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded border border-slate-100"><div class="w-1.5 h-1.5 rounded-full bg-brand-500"></div>savoir dire non</li>
      <li class="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded border border-slate-100"><div class="w-1.5 h-1.5 rounded-full bg-brand-500"></div>combattre la procrastination</li>
    </ul>
  </div>
  <div class="bg-blue-900 text-white p-6 rounded-xl shadow-lg">
    <p class="font-medium text-lg text-center">Mais gérer son énergie est encore autre chose, puisque sans elle, vous ne pourrez pas mettre en place tout ce qui est nécessaire, important, capital sur la durée !</p>
  </div>
</div>`
            },
          ],
        },
      ],
    });
    console.log("📚 Course created");

    // Create capsules
    const capsule1 = await Capsule.create({
      organizationId: org1._id,
      name: "Capsule Leadership 2025",
      totalHoursInitial: 40,
      remainingHours: 32,
      status: "ACTIVE",
      expirationDate: new Date("2025-12-31"),
      history: [
        {
          action: "DEBIT",
          amount: 8,
          date: new Date("2025-01-15"),
          userId: users[0]._id,
          reason: "Session de coaching individuel",
        },
      ],
    });

    const capsule2 = await Capsule.create({
      organizationId: org2._id,
      name: "Programme Communication",
      totalHoursInitial: 60,
      remainingHours: 45,
      status: "ACTIVE",
      expirationDate: new Date("2025-11-30"),
      history: [
        {
          action: "DEBIT",
          amount: 15,
          date: new Date("2025-02-01"),
          userId: users[3]._id,
          reason: "Atelier groupe",
        },
      ],
    });

    console.log("📦 Capsules created");

    // Create sessions
    const sessions = await Session.create([
      {
        capsuleId: capsule1._id,
        coachId: users[1]._id,
        attendees: [users[2]._id],
        startTime: new Date("2025-01-20T10:00:00"),
        endTime: new Date("2025-01-20T11:30:00"),
        duration: 90,
        status: "COMPLETED",
        videoUrl: "https://example.com/recording1",
        assessments: [
          {
            raterId: users[1]._id,
            targetId: users[2]._id,
            leadership: 8,
            communication: 7,
            adaptability: 9,
            emotionalInt: 8,
            comment: "Excellente progression sur les compétences de leadership",
          },
        ],
      },
      {
        capsuleId: capsule2._id,
        coachId: users[3]._id,
        attendees: [users[0]._id, users[1]._id],
        startTime: new Date("2025-12-20T14:00:00"),
        endTime: new Date("2025-12-20T16:00:00"),
        duration: 120,
        status: "SCHEDULED",
        videoUrl: "",
      },
    ]);

    console.log("📅 Sessions created");

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Organizations: ${await Organization.countDocuments()}`);
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Capsules: ${await Capsule.countDocuments()}`);
    console.log(`   Sessions: ${await Session.countDocuments()}`);

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
