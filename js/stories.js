// Recurring customers with a life story. Each comes back now and then for the next chapter of her life,
// sends a letter afterwards, and her dresses go into the album. Texts are written in English and Danish
// side by side (T registers the Danish translation).
(function (g) {
  const DG = (g.DG = g.DG || {});
  const da = {};
  const T = (en, dk) => { da[en] = dk; return en; };

  // gift: { money } | { happy } (family happiness) | { fabric, m } | { charm } (a keepsake for the shop)
  DG.STORIES = [
    {
      id: 'freja', name: 'Freja', start: 3,
      job: T('kindergarten teacher', 'pædagog'), liked: ['lavender', 'sage'], disliked: ['black'],
      look: { skin: '#f6d7bf', hair: '#b07a3e', style: 1, top: '#b9a6d9', bg: '#ebe2f3', glasses: false, earrings: true, shoes: '#c44d6c' },
      ch: [
        { arche: 'summer', gap: 0, minRep: 0, title: T('A first date', 'En første date'), reqs: ['notmaxi'],
          lines: [T("Hi, I'm Freja. I have a first date on Saturday: a picnic in Kongens Have!", 'Hej, jeg hedder Freja. Jeg skal på første date på lørdag: picnic i Kongens Have!'),
            T("Something sweet, but not too much. I don't want to look like I tried too hard.", 'Noget sødt, men ikke for meget. Det må ikke se ud, som om jeg har prøvet for hårdt.')],
          good: T('The picnic lasted until the sun went down. His name is Mads, and he brought strawberries. Thank you, Mie!', 'Picnicen varede, til solen gik ned. Han hedder Mads, og han havde jordbær med. Tak, Mie!'),
          ok: T('The date was nice. We talked for hours. Maybe there will be a second one?', 'Daten var hyggelig. Vi snakkede i timevis. Måske bliver der en date nummer to?'),
          gift: { happy: 4 } },
        { arche: 'guest', gap: 8, minRep: 15, title: T('Meeting his parents', 'Mød svigerforældrene'), reqs: ['kneeplus'],
          lines: [T('Remember me? Mads wants me to meet his parents. In Aarhus!', 'Kan du huske mig? Mads vil have, at jeg skal møde hans forældre. I Aarhus!'),
            T('Elegant, but not stiff. His mum is a retired judge.', 'Elegant, men ikke stiv. Hans mor er pensioneret dommer.')],
          good: T('His mum asked where I got my dress, and I told her all about you. I think she likes me!', 'Hans mor spurgte, hvor jeg havde kjolen fra, og jeg fortalte hende alt om dig. Jeg tror, hun kan lide mig!'),
          ok: T('Dinner went fine. His dad told the same joke three times. I laughed every time.', 'Middagen gik fint. Hans far fortalte den samme vittighed tre gange. Jeg grinede hver gang.'),
          gift: { fabric: 'cotton', m: 3 } },
        { arche: 'gala', gap: 10, minRep: 45, title: T('The engagement party', 'Forlovelsesfesten'), reqs: ['sparkle'],
          lines: [T('He proposed! On the harbour bus, of all places. I said yes before he finished the question.', 'Han friede! På havnebussen af alle steder. Jeg sagde ja, før han var færdig med spørgsmålet.'),
            T('We are having a party in Nyhavn, and I want to sparkle.', 'Vi holder fest i Nyhavn, og jeg vil funkle.')],
          good: T('Everyone danced until midnight. Mads cried during his speech. So did I.', 'Alle dansede til midnat. Mads græd under sin tale. Det gjorde jeg også.'),
          ok: T('What a party! The cake fell over, but nobody cared.', 'Sikke en fest! Kagen væltede, men det var der ingen, der tog sig af.'),
          gift: { money: 3000 } },
        { arche: 'bride', gap: 12, minRep: 65, title: T('The wedding', 'Brylluppet'), reqs: ['maxi', 'whitedress'],
          lines: [T("It's happening. Will you make my wedding dress, Mie? There's no one else I would ask.", 'Det sker nu. Vil du sy min brudekjole, Mie? Der er ingen andre, jeg ville spørge.'),
            T('The church is small and the garden party is big.', 'Kirken er lille, og havefesten er stor.')],
          good: T('I have never felt so beautiful. Mads could not stop looking at me. There is a photo of the dress for your wall.', 'Jeg har aldrig følt mig så smuk. Mads kunne ikke lade være med at kigge på mig. Her er et billede af kjolen til din væg.'),
          ok: T('We are married! It rained, and we danced in the rain anyway.', 'Vi er gift! Det regnede, og vi dansede i regnen alligevel.'),
          gift: { charm: 1 } },
        { arche: 'summer', gap: 14, minRep: 0, title: T('A baby on the way', 'En baby på vej'), reqs: ['roomy'], w: { comfort: 3, elegance: 1 },
          lines: [T("Guess what! We're expecting a baby in the spring.", 'Gæt hvad! Vi venter en baby til foråret.'),
            T('I need something soft that still feels like me.', 'Jeg har brug for noget blødt, der stadig føles som mig.')],
          good: T('I wear your dress almost every day. The baby kicks whenever I put it on, I swear.', 'Jeg har din kjole på næsten hver dag. Babyen sparker, hver gang jeg tager den på. Det sværger jeg.'),
          ok: T('Comfortable and lovely. Mads has started reading aloud to my belly.', 'Behagelig og dejlig. Mads er begyndt at læse højt for min mave.'),
          gift: { happy: 5 } },
        { arche: 'guest', gap: 14, minRep: 15, title: T('The christening', 'Barnedåben'), reqs: ['bowtie'],
          lines: [T('Little Alma is being christened on Sunday. You are invited, of course!', 'Lille Alma skal døbes på søndag. Du er selvfølgelig inviteret!'),
            T('Something light, with a little bow. Alma loves bows.', 'Noget let med en lille sløjfe. Alma elsker sløjfer.')],
          good: T('Alma slept through the whole service in my arms. Thank you for being part of our story, Mie.', 'Alma sov gennem hele dåben i mine arme. Tak, fordi du har været en del af vores historie, Mie.'),
          ok: T('Alma screamed at the priest, and the whole church laughed. A perfect day.', 'Alma skreg ad præsten, og hele kirken grinede. En perfekt dag.'),
          gift: { money: 2000 } },
      ],
    },
    {
      id: 'karla', name: 'Karla', start: 9,
      job: T('student', 'gymnasieelev'), liked: ['white', 'sky'], disliked: ['brown'],
      look: { skin: '#dca47c', hair: '#2a1b14', style: 3, top: '#8fc1e3', bg: '#dfe8f3', glasses: true, earrings: false, shoes: '#e8e0d6' },
      ch: [
        { arche: 'student', gap: 0, minRep: 0, title: T('The student cap', 'Studenterhuen'), reqs: ['whitedress'],
          lines: [T("Hi! I'm Karla. I graduate from gymnasium next week, and I need a studenterkjole.", 'Hej! Jeg hedder Karla. Jeg bliver student i næste uge, og jeg mangler en studenterkjole.'),
            T("It has to be white. That's the tradition! And I have to survive a day on a truck.", 'Den skal være hvid. Det er traditionen! Og den skal kunne holde til en hel dag på studentervognen.')],
          good: T('We drove around all day and I danced on the truck in your dress. My cap is covered in signatures!', 'Vi kørte rundt hele dagen, og jeg dansede på vognen i din kjole. Min hue er fyldt med underskrifter!'),
          ok: T('I am a student! Somebody spilled cava on me, but the dress held on.', 'Jeg er student! Nogen spildte cava på mig, men kjolen holdt.'),
          gift: { happy: 3 } },
        { arche: 'worker', gap: 9, minRep: 0, title: T('Roskilde Festival', 'Roskilde Festival'), reqs: ['pockets', 'notmaxi'],
          lines: [T("Karla again! I'm going to Roskilde Festival. Eight days in a tent!", 'Det er Karla igen! Jeg skal på Roskilde Festival. Otte dage i telt!'),
            T('Pockets for my phone and my wristband, and nothing that minds a bit of mud.', 'Lommer til min telefon og mit armbånd, og intet, der har noget imod lidt mudder.')],
          good: T('It rained for three days and I was the best-dressed person in the mud. A band played my favourite song!', 'Det regnede i tre dage, og jeg var den bedst klædte i mudderet. Et band spillede min yndlingssang!'),
          ok: T('Sunburnt, muddy and very happy. I lost my sunglasses but not your dress.', 'Solskoldet, mudret og meget glad. Jeg mistede mine solbriller, men ikke din kjole.'),
          gift: { fabric: 'denim', m: 3 } },
        { arche: 'office', gap: 12, minRep: 5, title: T('A job interview', 'En jobsamtale'), reqs: ['kneeplus'],
          lines: [T('I have an interview at a design studio on Vesterbro. My hands are already shaking.', 'Jeg skal til samtale hos et designstudie på Vesterbro. Mine hænder ryster allerede.'),
            T('I want to look like someone they can trust with their best clients.', 'Jeg vil ligne en, de kan betro deres bedste kunder.')],
          good: T('I GOT THE JOB! They said my dress showed I have an eye for detail. That was you!', 'JEG FIK JOBBET! De sagde, at min kjole viste, at jeg har sans for detaljer. Det var dig!'),
          ok: T('They want me back for a second interview. Fingers crossed!', 'De vil se mig igen til en anden samtale. Kryds fingre!'),
          gift: { money: 1500 } },
        { arche: 'artist', gap: 14, minRep: 10, title: T('Her first collection', 'Hendes første kollektion'),
          lines: [T("Mie! I'm showing my first little collection at work. Can you make the piece I open with?", 'Mie! Jeg viser min første lille kollektion på arbejdet. Kan du sy det stykke, jeg åbner med?'),
            T('Brave and a bit strange. You taught me that.', 'Modig og lidt underlig. Det har du lært mig.')],
          good: T('My boss wants to put my name on the next season. I can not believe it.', 'Min chef vil sætte mit navn på næste sæson. Jeg kan ikke tro det.'),
          ok: T('People clapped! Next time I will be braver.', 'Folk klappede! Næste gang vil jeg være modigere.'),
          gift: { fabric: 'silk', m: 2 } },
        { arche: 'gala', gap: 16, minRep: 45, title: T('Opening her own studio', 'Hun åbner sit eget studie'), reqs: ['sparkle'],
          lines: [T('I opened my own studio. And you are my guest of honour at the opening!', 'Jeg har åbnet mit eget studie. Og du er æresgæst til åbningen!'),
            T('Make me something I will remember for the rest of my life.', 'Sy mig noget, jeg vil huske resten af mit liv.')],
          good: T('There is a little sign on my wall now: "Inspired by Mie\'s Atelier." Thank you for everything.', 'Der hænger et lille skilt på min væg nu: "Inspireret af Mies Atelier." Tak for alt.'),
          ok: T('The opening was wonderful. You looked happy. I was so proud.', 'Åbningen var vidunderlig. Du så glad ud. Jeg var så stolt.'),
          gift: { charm: 1 } },
      ],
    },
    {
      id: 'inger', name: 'Inger', start: 20,
      job: T('retired seamstress', 'pensioneret syerske'), liked: ['plum', 'rose'], disliked: ['mustard'],
      look: { skin: '#efc3a0', hair: '#d9d4cc', style: 2, top: '#7c3b62', bg: '#f5dfe4', glasses: true, earrings: true, shoes: '#3b2a2f' },
      ch: [
        { arche: 'office', gap: 0, minRep: 5, title: T('Turning eighty', 'Firs år'), reqs: ['kneeplus', 'longsleeves'],
          lines: [T("Good day, dear. I'm Inger. I sewed dresses for fifty years, so I will notice every seam.", 'Goddag, min ven. Jeg hedder Inger. Jeg syede kjoler i halvtreds år, så jeg ser hver eneste søm.'),
            T('I turn eighty on Sunday. My grandchildren are throwing a party.', 'Jeg fylder firs på søndag. Mine børnebørn holder fest.')],
          good: T('Your seams are as straight as mine were. That is the highest praise I know, dear.', 'Dine sømme er lige så lige, som mine var. Det er den største ros, jeg kender, min ven.'),
          ok: T('A lovely party. You will get better, dear. I can see it in your hands.', 'En dejlig fest. Du bliver bedre, min ven. Jeg kan se det på dine hænder.'),
          gift: { fabric: 'wool', m: 3 } },
        { arche: 'guest', gap: 10, minRep: 15, title: T('Golden wedding', 'Guldbryllup'),
          lines: [T('Poul and I have been married for fifty years. Fifty! He still brings me coffee in bed.', 'Poul og jeg har været gift i halvtreds år. Halvtreds! Han giver mig stadig kaffe på sengen.'),
            T('Something gold, or at least something that remembers gold.', 'Noget guld, eller i hvert fald noget, der minder om guld.')],
          good: T('Poul said I looked like the day we met. He is a terrible liar, and I love him for it.', 'Poul sagde, at jeg så ud som den dag, vi mødtes. Han er en elendig løgner, og jeg elsker ham for det.'),
          ok: T('We danced one slow dance. Our knees did not agree, but our hearts did.', 'Vi dansede én langsom dans. Vores knæ var uenige, men vores hjerter var ikke.'),
          gift: { happy: 4 } },
        { arche: 'winter', gap: 12, minRep: 10, title: T('Christmas with the grandchildren', 'Jul med børnebørnene'), reqs: ['longsleeves'],
          lines: [T('All eleven grandchildren are coming for Christmas. ELEVEN.', 'Alle elleve børnebørn kommer til jul. ELLEVE.'),
            T('Warm, red if you like, and nothing that minds a little gravy.', 'Varm, gerne rød, og intet, der har noget imod lidt sovs.')],
          good: T('The little ones said I looked like the queen. I let them have extra risalamande.', 'De små sagde, at jeg lignede dronningen. Jeg lod dem få ekstra risalamande.'),
          ok: T('Gravy happened. The dress survived. Merry Christmas, dear.', 'Der kom sovs. Kjolen overlevede. Glædelig jul, min ven.'),
          gift: { money: 1000 } },
        { arche: 'summer', gap: 14, minRep: 0, title: T('A trip to Lake Garda', 'En tur til Gardasøen'), reqs: ['shortsleeves'],
          lines: [T('Poul surprised me with a trip to Lake Garda. At our age! Imagine.', 'Poul har overrasket mig med en tur til Gardasøen. I vores alder! Tænk engang.'),
            T('Light and easy. I want to eat ice cream by the water and feel thirty.', 'Let og nem. Jeg vil spise is ved vandet og føle mig som tredive.')],
          good: T('A postcard from Italy! The water is blue, the ice cream is pistachio and the dress is perfect.', 'Et postkort fra Italien! Vandet er blåt, isen er pistacie, og kjolen er perfekt.'),
          ok: T('Italy is hot and beautiful. Poul got sunburnt on his head. Again.', 'Italien er varmt og smukt. Poul blev solskoldet på hovedet. Igen.'),
          gift: { charm: 1 } },
      ],
    },
    {
      id: 'nadia', name: 'Nadia', start: 32,
      job: T('painter', 'maler'), liked: ['emerald', 'mustard'], disliked: ['blush'],
      look: { skin: '#a06a44', hair: '#1c1c1c', style: 1, top: '#1e7a58', bg: '#e2ecdf', glasses: false, earrings: true, shoes: '#7a4a2e' },
      ch: [
        { arche: 'artist', gap: 0, minRep: 10, title: T('A show in a café', 'En udstilling på en café'),
          lines: [T("I'm Nadia. I paint. Tomorrow nine of my paintings hang in a café on Nørrebro.", 'Jeg hedder Nadia. Jeg maler. I morgen hænger ni af mine malerier på en café på Nørrebro.'),
            T('I want a dress that looks like it belongs in one of them.', 'Jeg vil have en kjole, der ser ud, som om den hører hjemme i et af dem.')],
          good: T('I sold two paintings! The café owner wants the rest for the summer. You brought me luck.', 'Jeg solgte to malerier! Caféejeren vil have resten til sommer. Du bragte mig held.'),
          ok: T('People came, drank coffee and looked. That is a start!', 'Folk kom, drak kaffe og kiggede. Det er en start!'),
          gift: { charm: 1 } },
        { arche: 'influencer', gap: 12, minRep: 30, title: T('Her name in the newspaper', 'Hendes navn i avisen'),
          lines: [T('A journalist wants to photograph me in my studio. In Politiken!', 'En journalist vil fotografere mig i mit atelier. I Politiken!'),
            T('Make me look like an artist people should take seriously.', 'Få mig til at ligne en kunstner, man skal tage alvorligt.')],
          good: T('The photo is on page seven, and you can see the dress better than the paintings. I am not even mad.', 'Billedet er på side syv, og man kan se kjolen bedre end malerierne. Jeg er ikke engang sur.'),
          ok: T('The article is out. My mum bought twenty copies.', 'Artiklen er ude. Min mor købte tyve eksemplarer.'),
          gift: { money: 2500 } },
        { arche: 'gala', gap: 14, minRep: 45, title: T('Venice', 'Venedig'), reqs: ['maxi'],
          lines: [T('Mie. I have been invited to show in Venice. VENICE.', 'Mie. Jeg er inviteret til at udstille i Venedig. VENEDIG.'),
            T('Floor length, unforgettable, and it has to survive a gondola.', 'Gulvlang, uforglemmelig, og den skal kunne overleve en gondol.')],
          good: T('I stood next to my painting in your dress and a contessa asked to buy both. I said no to the dress.', 'Jeg stod ved mit maleri i din kjole, og en grevinde ville købe begge dele. Jeg sagde nej til kjolen.'),
          ok: T('Venice is a dream. My feet hurt, my heart does not.', 'Venedig er en drøm. Mine fødder gør ondt, mit hjerte gør ikke.'),
          gift: { money: 4000 } },
        { arche: 'artist', gap: 16, minRep: 10, title: T('A painting for Mie', 'Et maleri til Mie'),
          lines: [T('This time I am not here for me. I have painted your shop, and I want to wear something from it to the unveiling.', 'Denne gang er jeg her ikke for min egen skyld. Jeg har malet din butik, og jeg vil have noget derfra på til afsløringen.'),
            T('Surprise me. You always do.', 'Overrask mig. Det gør du altid.')],
          good: T('The painting of your shop is yours. Hang it by the mirror, where the light is good.', 'Maleriet af din butik er dit. Hæng det ved spejlet, hvor lyset er godt.'),
          ok: T('The painting is yours, whatever happens. Thank you for being my muse.', 'Maleriet er dit, uanset hvad. Tak, fordi du er min muse.'),
          gift: { charm: 2 } },
      ],
    },
    {
      id: 'sofie', name: 'Sofie', start: 14,
      job: T('nurse', 'sygeplejerske'), liked: ['sky', 'coral'], disliked: ['red'],
      look: { skin: '#c68a5e', hair: '#a33a1f', style: 0, top: '#f28c6b', bg: '#f6e3d6', glasses: false, earrings: false, shoes: '#2f3b55' },
      ch: [
        { arche: 'worker', gap: 0, minRep: 0, title: T('Twelve-hour shifts', 'Tolv timers vagter'), reqs: ['pockets'],
          lines: [T("I'm Sofie, a nurse at Rigshospitalet, and a single mum to Oliver.", 'Jeg hedder Sofie, jeg er sygeplejerske på Rigshospitalet og alenemor til Oliver.'),
            T('I need something for after my shift, when I pick him up. Something that feels like a hug.', 'Jeg har brug for noget til efter min vagt, når jeg henter ham. Noget, der føles som et kram.')],
          good: T('Oliver said I looked "like a mum in a film." I am framing that sentence.', 'Oliver sagde, at jeg lignede "en mor i en film". Den sætning skal i ramme.'),
          ok: T('Comfy and good. I wore it to the playground and nobody fell off anything.', 'Behagelig og god. Jeg havde den på på legepladsen, og ingen faldt ned fra noget.'),
          gift: { happy: 3 } },
        { arche: 'office', gap: 12, minRep: 5, title: T("Oliver's confirmation", 'Olivers konfirmation'), reqs: ['kneeplus'],
          lines: [T('Oliver is being confirmed! Where did the time go? He was three yesterday.', 'Oliver skal konfirmeres! Hvor blev tiden af? Han var tre år i går.'),
            T('I want to look proud and not cry in the photos. Well, not much.', 'Jeg vil se stolt ud og ikke græde på billederne. I hvert fald ikke meget.')],
          good: T('I cried in every photo. Oliver hugged me in front of his friends. Best day.', 'Jeg græd på alle billederne. Oliver krammede mig foran sine venner. Bedste dag.'),
          ok: T('He gave a speech about me. Thirty seconds, but what thirty seconds.', 'Han holdt en tale om mig. Tredive sekunder, men sikke tredive sekunder.'),
          gift: { money: 1500 } },
        { arche: 'gala', gap: 14, minRep: 45, title: T('Head nurse', 'Afdelingssygeplejerske'),
          lines: [T("They made me head nurse. There's a hospital gala, and I have never been to a gala.", 'De har gjort mig til afdelingssygeplejerske. Der er gallafest på hospitalet, og jeg har aldrig været til gallafest.'),
            T('Make me feel like I belong there.', 'Få mig til at føle, at jeg hører til der.')],
          good: T('A surgeon asked me to dance. A surgeon! I said yes, of course.', 'En kirurg bød mig op til dans. En kirurg! Jeg sagde selvfølgelig ja.'),
          ok: T('I ate four canapés and gave a speech. Both went well.', 'Jeg spiste fire canapéer og holdt en tale. Begge dele gik godt.'),
          gift: { money: 3000 } },
        { arche: 'summer', gap: 14, minRep: 0, title: T('A summer house weekend', 'En weekend i sommerhus'), reqs: ['shortsleeves'],
          lines: [T('The surgeon has a summer house in Skagen, and Oliver and I are invited.', 'Kirurgen har et sommerhus i Skagen, og Oliver og jeg er inviteret.'),
            T('Something for long evenings in the light. You know the Skagen light.', 'Noget til lange aftener i lyset. Du kender Skagenslyset.')],
          good: T('We watched the sun go down where the two seas meet. Oliver likes him. So do I.', 'Vi så solen gå ned, hvor de to have mødes. Oliver kan lide ham. Det kan jeg også.'),
          ok: T('Sand everywhere, sunburnt noses, a very good weekend.', 'Sand overalt, solskoldede næser, en rigtig god weekend.'),
          gift: { happy: 5 } },
      ],
    },
  ];

  // new requests used by the stories
  Object.assign(DG.REQS, {
    whitedress: { short: T('White or ivory', 'Hvid eller elfenben'), text: T('It has to be white or ivory.', 'Den skal være hvid eller elfenben.'), check: d => ['white', 'ivory'].includes(d.mainColor) },
    roomy: { short: T('Room at the waist (empire, wrap or A-line)', 'Plads i taljen (empire, slå-om eller A-linje)'), text: T('Something with room around the waist, please.', 'Noget med plads omkring taljen, tak.'), check: d => ['empire', 'wrap', 'aline'].includes(d.silhouette) },
    sparkle: { short: T('Something that sparkles', 'Noget der funkler'), text: T('And I want to sparkle: sequins or beading!', 'Og jeg vil funkle: pailletter eller perler!'), check: d => d.extras.includes('sequins') || d.extras.includes('beading') },
    bowtie: { short: T('A bow', 'En sløjfe'), text: T('A bow somewhere, please.', 'En sløjfe et sted, tak.'), check: d => d.extras.includes('bow') },
  });

  // ---------- story logic ----------
  const byId = (a, id) => a.find(x => x.id === id);
  // pacing: chapters are spread out so a life story unfolds over a couple of in-game years
  DG.STORY_PACE = 2.2;
  DG.storyState = (G, id) => (G.stories[id] = G.stories[id] || { ch: 0, next: byId(DG.STORIES, id).start, done: [] });
  DG.storyChapter = (G, st) => st.ch[DG.storyState(G, st.id).ch] || null;

  // Called each morning: maybe one story customer walks in (never two at once).
  DG.storyArrival = function (G, rnd = Math.random) {
    const busy = new Set(G.queue.map(c => c.story).concat(G.active && G.active.story ? [G.active.story] : []));
    const ready = DG.STORIES.filter(st => {
      const s = DG.storyState(G, st.id), chap = st.ch[s.ch];
      return chap && G.day >= s.next && G.rep >= chap.minRep && !busy.has(st.id);
    }).sort((a, b) => DG.storyState(G, a.id).next - DG.storyState(G, b.id).next);
    if (!ready.length || rnd() > 0.5) return null;
    const st = ready[0], s = DG.storyState(G, st.id), chap = st.ch[s.ch];
    const base = { cid: 'story-' + st.id, name: st.name, look: Object.assign({}, st.look), job: st.job, liked: st.liked.slice(), disliked: st.disliked.slice(), visits: s.ch, lastS: s.done.length ? s.done[s.done.length - 1].S : 0 };
    const c = DG.genCustomer(G, { arche: chap.arche, base, storyLines: chap.lines, reqs: chap.reqs, w: chap.w });
    Object.assign(c, { story: st.id, ch: s.ch, title: chap.title });
    return c;
  };

  // After her dress: the chapter is written, the next one comes later, and a letter arrives tomorrow.
  DG.storyDelivered = function (G, cust, S, design) {
    const st = byId(DG.STORIES, cust.story);
    if (!st) return;
    const s = DG.storyState(G, st.id), chap = st.ch[cust.ch];
    if (!chap || s.ch !== cust.ch) return;
    s.done.push({ ch: cust.ch, S, day: G.day, design: JSON.parse(JSON.stringify(design)) });
    s.ch += 1;
    const nx = st.ch[s.ch];
    s.next = G.day + (nx ? Math.round(nx.gap * DG.STORY_PACE) : 0);
    G.mail.push({ id: 'm' + G.nextId++, from: st.name, story: st.id, look: st.look, day: G.day + 1, text: S >= 80 ? chap.good : chap.ok, gift: chap.gift || null, title: chap.title });
    if (!nx) G.stats.storiesDone = (G.stats.storiesDone || 0) + 1;
  };
  // A story order that was declined comes back a few days later.
  DG.storyDeclined = function (G, cust) { if (cust.story) DG.storyState(G, cust.story).next = G.day + 3; };

  // ---------- post: letters and little gifts ----------
  DG.mailToday = G => G.mail.filter(m => m.day <= G.day);
  DG.openMail = function (G, id) {
    const m = G.mail.find(x => x.id === id);
    if (!m) return null;
    G.mail = G.mail.filter(x => x.id !== id);
    const gf = m.gift || {};
    if (gf.money) G.money += gf.money;
    if (gf.happy) G.home.happy = Math.min(100, G.home.happy + gf.happy);
    if (gf.fabric) G.inv.fabrics[gf.fabric] = Math.round(((G.inv.fabrics[gf.fabric] || 0) + gf.m) * 10) / 10;
    if (gf.charm) G.keepsakes = (G.keepsakes || 0) + gf.charm;
    G.letters.unshift({ from: m.from, text: m.text, day: m.day, title: m.title || '', story: m.story || null });
    if (G.letters.length > 60) G.letters.pop();
    return m;
  };

  if (DG.addTranslations) DG.addTranslations(da);
  else DG.pendingDa = da;
})(typeof window !== 'undefined' ? window : globalThis);
