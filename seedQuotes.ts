import "dotenv/config";
import mongoose from "mongoose";
import dbConnect from "./lib/db";
import Quote from "./models/Quote";

async function seedQuotes() {
    try {
        await dbConnect();

        const quotes = [
            { text: "La discipline est le pont entre les objectifs et les résultats.", author: "Jim Rohn" },
            { text: "Le succès est la somme de petits efforts répétés jour après jour.", author: "Robert Collier" },
            { text: "Vous ne gérez pas le temps, vous vous gérez vous-même.", author: "Brian Tracy" },
            { text: "La motivation vous fait commencer, l'habitude vous fait continuer.", author: "Jim Ryun" },
            { text: "Le leadership commence par l'exemple.", author: "John C. Maxwell" },
            { text: "Fixez des objectifs si grands qu'ils vous obligent à devenir meilleur.", author: "Les Brown" },
            { text: "Chaque jour est une opportunité de devenir une meilleure version de soi-même.", author: "Anonyme" },
            { text: "Le changement commence lorsque l'inconfort devient plus supportable que l'immobilisme.", author: "Tony Robbins" },
            { text: "La clarté précède toujours la maîtrise.", author: "Robin Sharma" },
            { text: "Ce que vous faites quotidiennement compte plus que ce que vous faites occasionnellement.", author: "John C. Maxwell" },
            { text: "L'excellence n'est pas une destination, c'est un voyage continu.", author: "Brian Tracy" },
            { text: "Votre attitude, pas votre aptitude, détermine votre altitude.", author: "Zig Ziglar" },
            { text: "Ne comptez pas les jours, faites en sorte que les jours comptent.", author: "Muhammad Ali" },
            { text: "La seule limite à notre réalisation de demain sera nos doutes d'aujourd'hui.", author: "Franklin D. Roosevelt" },
            { text: "Le succès n'est pas la clé du bonheur. Le bonheur est la clé du succès.", author: "Albert Schweitzer" },
            { text: "Agissez comme s'il était impossible d'échouer.", author: "Winston Churchill" },
            { text: "La persévérance n'est pas une longue course, c'est beaucoup de petites courses l'une après l'autre.", author: "Walter Elliot" },
            { text: "Vous êtes ce que vous faites de façon répétée. L'excellence n'est donc pas un acte mais une habitude.", author: "Aristote" },
            { text: "Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment, c'est maintenant.", author: "Proverbe chinois" },
            { text: "La différence entre l'ordinaire et l'extraordinaire, c'est ce petit supplément.", author: "Jimmy Johnson" },
            { text: "Ne laissez jamais le doute arrêter ce que vous voulez accomplir.", author: "Marie Curie" },
            { text: "Les champions ne sont pas faits dans les salles de sport. Ils sont faits de quelque chose de profond en eux.", author: "Muhammad Ali" },
            { text: "Le succès, c'est tomber sept fois et se relever huit.", author: "Proverbe japonais" },
            { text: "La vraie mesure de votre richesse est la valeur que vous auriez si vous perdiez tout votre argent.", author: "Anonyme" },
            { text: "Commencez là où vous êtes. Utilisez ce que vous avez. Faites ce que vous pouvez.", author: "Arthur Ashe" },
            { text: "Le seul endroit où le succès vient avant le travail, c'est dans le dictionnaire.", author: "Vidal Sassoon" },
            { text: "Si vous voulez quelque chose que vous n'avez jamais eu, vous devez faire quelque chose que vous n'avez jamais fait.", author: "Thomas Jefferson" },
            { text: "La vie est 10% ce qui nous arrive et 90% comment nous y réagissons.", author: "Charles R. Swindoll" },
            { text: "Les opportunités ne se produisent pas, vous les créez.", author: "Chris Grosser" },
            { text: "Ne regardez pas l'horloge, faites ce qu'elle fait : continuez d'avancer.", author: "Sam Levenson" },
            { text: "Tout ce dont vous avez besoin est déjà en vous. Commencez simplement.", author: "Anonyme" },
            { text: "Le futur appartient à ceux qui croient en la beauté de leurs rêves.", author: "Eleanor Roosevelt" },
            { text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
            { text: "N'abandonnez pas. Souffrez maintenant et vivez le reste de votre vie comme un champion.", author: "Muhammad Ali" },
            { text: "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.", author: "Sénèque" },
            { text: "La vie rétrécit ou s'élargit proportionnellement à votre courage.", author: "Anaïs Nin" },
            { text: "Le secret pour aller de l'avant est de commencer.", author: "Mark Twain" },
            { text: "Votre temps est limité, ne le gaspillez pas en vivant la vie de quelqu'un d'autre.", author: "Steve Jobs" },
            { text: "Les gagnants trouvent des moyens, les perdants trouvent des excuses.", author: "F. D. Roosevelt" },
            { text: "La perfection n'est pas atteignable, mais si nous poursuivons la perfection, nous pouvons attraper l'excellence.", author: "Vince Lombardi" },
            { text: "Le seul impossible est celui que l'on ne tente pas.", author: "Anonyme" },
            { text: "Soyez vous-même, tous les autres sont déjà pris.", author: "Oscar Wilde" },
            { text: "L'échec est simplement l'opportunité de recommencer, cette fois de manière plus intelligente.", author: "Henry Ford" },
            { text: "Ce qui compte, ce n'est pas d'arriver en haut, c'est d'y rester.", author: "Vince Lombardi" },
            { text: "La seule personne que vous êtes destiné à devenir est la personne que vous décidez d'être.", author: "Ralph Waldo Emerson" },
            { text: "Croyez en vous-même et tout devient possible.", author: "Anonyme" },
            { text: "Le courage n'est pas l'absence de peur, mais le jugement qu'autre chose est plus important que la peur.", author: "James Neil Hollingworth" },
            { text: "Si vous pensez que vous pouvez ou que vous ne pouvez pas, dans les deux cas vous avez raison.", author: "Henry Ford" },
            { text: "L'action est la clé fondamentale de tout succès.", author: "Pablo Picasso" },
            { text: "Ne dites pas que vous n'avez pas assez de temps. Vous avez exactement le même nombre d'heures par jour qu'ont eu Helen Keller, Pasteur, Michel-Ange, Mère Teresa, Léonard de Vinci, Thomas Jefferson et Albert Einstein.", author: "H. Jackson Brown Jr." },
            { text: "La qualité n'est pas un acte, c'est une habitude.", author: "Aristote" },
            { text: "Peu importe la lenteur à laquelle vous avancez tant que vous ne vous arrêtez pas.", author: "Confucius" },
            { text: "Le moment le plus sombre est toujours juste avant l'aube.", author: "Thomas Fuller" },
            { text: "Faites aujourd'hui ce que d'autres ne feront pas, faites demain ce que d'autres ne pourront pas.", author: "Jerry Rice" },
            { text: "La route du succès est toujours en construction.", author: "Lily Tomlin" },
            { text: "Le talent gagne des matchs, mais le travail d'équipe et l'intelligence gagnent des championnats.", author: "Michael Jordan" },
            { text: "Les grands esprits discutent des idées, les esprits moyens discutent des événements, les petits esprits discutent des gens.", author: "Eleanor Roosevelt" },
            { text: "Si vous n'êtes pas disposé à risquer l'inhabituel, vous devrez vous contenter de l'ordinaire.", author: "Jim Rohn" },
            { text: "Le succès consiste à aller d'échec en échec sans perdre son enthousiasme.", author: "Winston Churchill" },
            { text: "Ce n'est pas la montagne que nous conquérons, mais nous-mêmes.", author: "Edmund Hillary" }
        ];

        await Quote.deleteMany({});
        await Quote.insertMany(quotes);

        console.log("Quotes seeded successfully");
        console.log(`${quotes.length} Quotes added successfully`);
    } catch (error) {
        console.error("Error seeding quotes:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedQuotes();
