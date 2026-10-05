# Life of Mie 🧵👗🏡

A browser game made mainly for iPad. Mie runs a small dress atelier, **Mie's Atelier**, in Copenhagen. Customers come in with wishes, she buys fabric at the market, and you design and sew the dress. Then you see how happy the customer is.

No build step and no dependencies. It is plain HTML, CSS and JavaScript.

## Play

- **Locally:** open `index.html` in a browser, or run `npm start` and go to http://localhost:5173.
- **On iPad via GitHub Pages:**
  1. Settings → Pages → *Deploy from a branch*, then pick `main` and the `/ (root)` folder.
  2. The game appears at https://adamsinator.github.io/life-of-mie/.
  3. Open it in Safari and choose *Share → Add to Home Screen*. It then opens full screen like an app.

  GitHub Pages needs a **public** repository, or a paid GitHub plan for a private one.
- **Single file:** `npm run build` writes `dist/life-of-mie.html`. That one file works anywhere, for example from AirDrop or iCloud Drive.

## Languages

The game is fully playable in **English and Danish** (*Mies liv*). It starts in Danish when the device is set to Danish. Switch under **Menu → Settings → Language / Sprog**, or on the welcome screen. All texts are translated, including customer requests, item names, tips, help and the evening stories. Translations live in `js/lang-da.js`, and the engine in `js/i18n.js` translates text the moment it appears on screen.

## Getting started

A new player gets a short introduction, then **tips from Mie** that walk through the first order: reading wishes, designing, buying materials, sewing, the result and closing the shop. More tips appear as new things become relevant (market, family, rack, seasons, goals, pottery). Each tip shows once with the relevant button highlighted. They can be switched off in Settings and replayed from **Menu → Help**, which also has help topics for every part of the game.

## Website and app icon

- **Live site:** https://adamsinator.github.io/life-of-mie/. GitHub Pages deploys from `main`, so every push to `main` is live within a minute or two. Reload Safari, or reopen the home-screen app, to get the newest version.
- **Logo:** a tulip with a sewing needle and a golden thread. It's drawn in `DG.logoSVG()` (js/render.js). `node tools/make-icons.js` renders `icons/icon.svg` and the PNG app icons (180 px for iPad/iPhone home screens, 192 and 512 px for Android), and `manifest.webmanifest` describes the installed app.

## Players and saving

- On first start you choose a name (it defaults to **Mie**). That creates a **player**, and each player has their own shop. Add, rename, switch or delete players under **Menu → Players**.
- The game **saves automatically** after every move, in this browser on this device (`localStorage`). There is no account and no server. **Menu → Save → Save now** is there for peace of mind.
- **Moving to another device:** Menu → Save → *Show save code* gives a code starting with `MIE1:`. Send it to yourself, then on the other device use *Import as a new player*.
- Saves from older versions of the game become "Player 1" automatically.

### Save safety

Updates of the game must never cost anyone their progress:

- **Additive migrations only.** `DG.ensureDefaults` fills in fields that newer versions need; it never removes or resets progress. `G.schema` records which migrations a save has had.
- **Backups.** Each time a game is opened, a copy of the save goes into a ring of the last 3 days played (`mies-atelier-backups-<id>`). Before a save from an older version is upgraded, an untouched copy is kept once (`mies-atelier-premigrate-<id>-<schema>`). **Menu → Save → Earlier saves** restores a backup.
- **Nothing is overwritten on failure.** A save that cannot be opened is moved aside (`mies-atelier-rescue-<id>-<time>`) and the player is taken to the backups; a failed write shows a warning instead of failing silently.
- **Frozen saves.** `tests/fixtures` holds real saves made by every earlier version. `tests/saves.test.js` checks that each opens with its day, money, reputation, upgrades, stock, customers, home, mortgage, wardrobe and goals intact, and plays on.
- The game asks the browser for persistent storage. Safari may still clear website data after a long break, so on iPad, **Add to Home Screen** (which keeps storage) and an occasional save code are the safest.

## Feel on iPad

- Made for an iPad **lying down (landscape)**. Shop and home keep the scene on the left and what you do on the right; the workshop and pottery keep the preview in view while you choose.
- Screens are patched, not rebuilt: each tap builds the new screen off-screen (translated there) and only changed parts of the page are touched.
- Brush strokes use every Apple Pencil/finger sample (120 per second), are smoothed, and get thicker with Pencil pressure or thinner with a quick finger flick. While the Pencil is in use, a resting palm does not paint. Strokes are saved as their centre line (`x y r,...`), and their outline is drawn when shown.
- Cutting and ironing sweep the whole distance between samples, so fast swipes never skip. The potter's wheel grows the pot with a transform each frame, with no redraws.
- No double-tap zoom, text selection, long-press menus or rubber-band scrolling outside text fields.
- **Offline:** a service worker (`sw.js`) keeps a copy of the game for when there is no connection. It is network first, so online you always get the newest version from GitHub Pages, and it never touches saves. Fonts are bundled in `fonts/` (SIL Open Font License).

## Settings

Menu → Settings has these options:
- Theme: auto, light or dark.
- Music volume and sound-effect volume. Both are synthesised live with Web Audio, so there are no audio files.
- Animations: on or off.
- **Mini-games:** *Full* or *Quick*. Full means cut, stitch and iron each dress, and knead clay before the wheel. Quick means only the stitching and the wheel.

## How a day works

1. **Shop:** customers wait in the shop. Each has
   - wishes, rated 1–3 ♥, across six qualities: quality, workwear, creativity, exclusivity, elegance and comfort
   - must-haves, such as pockets, long sleeves or floor length
   - colours they love and dislike, silhouettes they prefer, and a budget.
2. **Market:** buy fabric by the metre and notions (zippers, buttons, ribbon, lace trim, sequins, embroidery thread, crystals). Fabric prices move every morning, and some days have a sale.
3. **Workshop:** pick the main and accent fabric, colours, silhouette, length, neckline, sleeves, closure and extras. The dress preview and the stat bars update live. A black mark on a bar shows the customer's wish for that quality. More than three decorations make a dress look over-done.
4. **Sewing** happens in three mini-games:
   - **Cut:** trace the dashed pattern line with your finger.
   - **Stitch:** tap when the needle is over the green zone.
   - **Iron:** swipe the iron over the wrinkles.

   Craft = 30% cutting + 50% stitching + 20% ironing. It raises quality and counts for 10% of satisfaction.
5. **Result:** stars and a word for how happy she is, and what she paid; *How did she judge it?* shows the full breakdown. Satisfaction decides payment, tip and reputation. Regulars return with new requests and bigger budgets.
6. **Close the shop:** the evening page tells the day's little story; *Today's accounts* shows the numbers. A new day begins.

Reputation unlocks new kinds of customers, ending with wedding guests, influencers, gala guests and brides.

## Cozy by design

There is no way to lose and nothing runs on a clock:

- **No game over.** If the purse drops below 500 kr in the evening, Mie's mum and dad top it up to 2.000 kr (`DG.HELP_FLOOR`). Saves that had ended in an earlier version open again.
- **Nobody is turned away.** Customers still waiting at closing time come back the next morning (up to 3), with no reputation lost. With Lise the assistant they return in a sunny mood (+3 satisfaction). Declining an order is free.
- **Gentle reputation.** A weak dress costs at most 0.6 reputation, and every customer may return.
- **Fewer numbers.** The top bar shows the season and day, the purse, and reputation as 1–5 stars. Results and evenings use stars and words, with the numbers one tap away. All money details are in **Home → Accounts** (the last 60 days are kept in `G.ledger`).
- Mini-game timers are relaxed (cut 20 s, iron 12 s, knead 7 s).
- **Helping hands.** In the workshop, *✨ Mie's idea* sketches an affordable design that leans on what the customer loves (usually about four stars, so there is still room to make it shine; tap again for another). *Buy what's missing and sew* does both in one tap, and the button stays under the dress on a landscape iPad. The stat bars show no decimals, just the bar and the wish mark.
- **Small comforts.** After a dress, *Next customer* goes straight to whoever is waiting. Finished goals are collected right from the shop banner. A mis-tap at the market can be undone the same day.
- **Sound and light.** A slow music box with a wandering melody and a soft room reverb. An ambience layer (its own volume under Settings) plays birds in spring and summer, wind in autumn, a crackling fire in winter, and rain on rainy days; when the day's work is done it goes quiet, and the shop fades into evening light with lamps glowing.

## Prices

All prices are realistic Copenhagen kroner: fabric from 60 kr/m (polyester) to 1.500 kr/m (cashmere), customer budgets from about 1.800 kr (students) to 45.000 kr (brides), and shop rent from 1.000 kr a day.

## Spending money

Besides fabric and notions, the **Upgrades** screen has five tabs: Equipment, Expansion (pottery studio, upstairs floor, described below), Decor, Staff and Marketing.

| Tab | What you buy | Effect |
|---|---|---|
| Equipment | Sewing machine, shop window, supplier network, embroidery machine, market haggling, fitting room | Better stitching, more and richer customers, premium fabrics, embroidery and beading, cheaper market, higher satisfaction. Each level adds 100 kr to the daily rent (shop rent starts at 1.000 kr/day). |
| Decor | Plant, window flowers, rug, mirror, sketch gallery, espresso machine, armchair, neon sign, chandelier, and four wallpapers | Each item appears in the shop scene and adds **charm**. Every charm point gives +0.25 satisfaction, +0.5% customer budgets and a better chance of rack sales. |
| Staff | Oskar the apprentice (3.000 kr + 600 kr/day), Lise the shop assistant (4.000 kr + 900 kr/day) | Oskar: 10% less fabric per dress and a wider stitch zone. Lise: one more customer per day, and no reputation loss for customers you could not help. |
| Marketing | Flyers, newspaper ad, influencer shout-out, fashion show | Paid today, works tomorrow: extra customers, bigger budgets, a guaranteed high-end client, or an immediate reputation boost. |

The **ready-to-wear rack** on the Shop screen lets Mie sew a dress without an order, which is a good way to use leftover fabric. The price tag is $0.9\cdot\text{materials} + 18\cdot\text{appeal}$, where appeal is the mean of the dress's three best stats. Each evening every rack dress sells with probability $\min(0.85,\ 0.25 + 0.03\cdot\text{charm} + 0.05\cdot\text{shop window level})$. Dresses that don't sell can be marked down.

## Seasons

Every 7 days the season changes: spring → summer → autumn → winter, starting in spring. The view through the shop window changes with it.

- **Customers:** each season changes who comes in. Picnics in summer, galas and cozy winter dresses in winter, workers and office dresses in autumn, wedding guests in spring and summer.
- **Market:** in-season fabrics cost 12% more and off-season fabrics 15% less. You can buy wool cheap in July and keep it for winter.
- **Satisfaction:** a main fabric that is in season gives +3. An off-season one (wool in summer, linen in winter) gives −4.

## Pottery studio

Buy the **Pottery studio** under Upgrades → Expansion (8.000 kr, level 2 for 20.000 kr). In the Pottery screen you:

1. Pick a shape (cup, mug, bowl, plate, planter, jug, vase, amphora, teapot), a clay (terracotta, stoneware, porcelain), a glaze and a decoration. Clay, glazes and gold leaf are sold at the market.
2. **Knead the clay:** tap fast to push out air bubbles. Good kneading lowers the crack risk (×0.8 when perfect, ×1.3 when not kneaded).
3. **Throw it on the wheel:** hold the button to press on the clay and let go to ease off. Keep the marker inside the moving green band while the pot rises. Harder shapes move the band faster and make it narrower.
4. **Paint it** (if you chose *Hand-painted*): draw on the pot with your finger, using 8 colours and 3 brush sizes. Value multiplier: $1.1 + 0.05\cdot\min(4,\text{colours}) + $ up to $0.1$ for how much paint you used, so at most ×1.4. Your painting is saved with the pot and shown on the shelf.
5. The pot goes into the **kiln** and is fired overnight. The crack risk is $0.32\,(1-\text{score})\cdot\text{difficulty}$, halved with the electric kiln, and between 3% and 60%.
6. Pots that survive go on the **shelf**. Each sells with probability $\min(0.8,\ 0.3 + 0.02\cdot\text{charm})$ per evening. Up to 3 pots on display add charm to the shop.

Price: $\text{shape base}\cdot\text{clay}\cdot\text{glaze}\cdot\text{decoration}\cdot(0.6 + 0.8\cdot\text{score})$.

## Mie's home

The **Home** screen shows Mie's flat above the atelier: her husband **Adam**, their daughter **Elizabeth** (3) and **Dexter** the cat.

- **Family happiness** (0–100) drops 10 every night. Each toy you own slows the drop by 1, down to a minimum of 3, and it drops 8 more if Dexter has no food.
  - Above 75, Mie is happy and rested: +2 satisfaction on every dress and a wider stitch zone.
  - Below 30, she misses her family: −3 satisfaction.
- **Every day:** play with Elizabeth and pet Dexter (tap him, he purrs). Both are free, once a day each.
- **Outings:** badminton with Adam, ice cream in Nyhavn, a beach day at Amager Strand (summer only), movie night with popcorn (winter only), Copenhagen Zoo, date night with Adam, a family day at Tivoli. One outing per day.
- **Shopping:** toys for Elizabeth (crayons, teddy bear, wooden train, puppet theatre, tricycle, dollhouse) and things for Dexter (feather wand, scratching post, cat bed, cat tower). They all appear in the scene.
- **Where they live:** the family starts in a **rented flat in Nørrebro** (300 kr/day) and can buy their way up in five steps. Each move raises the lowest level family happiness can fall to, slows its nightly drop by 1 and changes the view from the window.

  | Step | Home | Price | Happiness never below |
  |---|---|---|---|
  | 1 | Ejerlejlighed on Frederiksberg | 4.500.000 kr | 10 |
  | 2 | Rækkehus in Valby | 6.500.000 kr | 20 |
  | 3 | Parcelhus in Lyngby | 11.000.000 kr | 30 |
  | 4 | Villa in Hellerup | 25.000.000 kr | 40 |
  | 5 | **Strandvejsvilla in Klampenborg**, with a view over Øresund | 75.000.000 kr | 50 |

- **Buying with a realkreditlån:** each purchase needs a 5% down payment. The equity in your current home counts towards it, so moving up rolls your equity forward. The rest is a 30-year fixed-rate annuity loan at 4%, paid daily:

  $$\text{payment per day} = \frac{1}{365}\cdot L\,\frac{r}{1-(1+r)^{-n}},\qquad r = 4\%,\ n = 30$$

  Each day, interest accrues on the remaining debt and the payment covers interest plus repayment. You can make extra repayments (100.000 kr, 1.000.000 kr or the whole loan), and the payment is then recalculated over the remaining term.
- **Adam's salary:** 1.000 kr per day net goes into the family budget.
- **Cat food** lasts 7 days. A hungry Dexter says "Mjav!".
- Each evening brings a little story from home.

## Mie's wardrobe

Home → **Mie's wardrobe** sells clothes for Mie herself:
- **Outfits:** Breton stripes, a chunky knit, a linen summer dress, a silk blouse, a trench coat, a tailored blazer and a velvet evening gown.
- **Accessories:** a flower hair clip, a silk scarf, a red beret and a pearl necklace.
- **Glasses:** round frames in tortoiseshell, cherry red or thin gold.

What she wears shows everywhere: in the shop, at home and in the tips. Each piece she is wearing adds **style charm**, which counts towards the shop's charm. Seasonal pieces give +1 extra in their season (knit in winter, summer dress in summer, trench in autumn, hair clip in spring). Buying something new makes Mie a little happier too.

## Upstairs floor and goals

- **Upstairs floor** (150.000 kr, +700 kr/day rent): +1 customer per day (and room for one more) and +2 rack hangers.
- **Goals:** 16 milestones with cash rewards, such as your first dress, 5 workwear dresses, a 95% masterpiece, a teapot that survives the kiln, all four seasons, and a bride's dress. Goals stay complete once reached. Collect the rewards on the Goals screen.

## SKAT

Each evening SKAT is paid on the shop's profit (family spending, house purchases and loan repayments are not business costs): 37% on the first 2.000 kr above a 150 kr daily allowance, and 52% top tax above that. Mortgage interest is deductible (rentefradrag), while family spending is not. An **accountant (revisor)** under Upgrades → Equipment lowers it. Level 1 (12.000 kr) finds 1.000 kr more deductions a day. Level 2 (35.000 kr) uses *virksomhedsordningen* to cut the top rate to 42% and finds 2.500 kr of deductions a day. The day-end summary shows how much the accountant saved. Early days are untouched; it stops a booming shop from turning money meaningless.

## Testing

- `npm test` runs balance, scoring, render and save tests, including every frozen save in `tests/fixtures`.
- `npm run test:browser` checks the game in a real Chromium (needs Playwright): Danish on every screen, first-version saves in the page, damaged-save rescue, that patched screens equal freshly built ones, and the touch mini-games.
- `npm run sim` plays many full games with bots through the game logic and checks invariants after every step: no NaN, no negative stock, meters within range, kilns and racks not over-full, no exceptions. Add `human` (`node tests/sim.js 40 60 human`) for bots that try only a few designs.

## Scoring model

For a customer with weights $w_i$ and targets $t_i$, and dress stats $a_i \in [0,10]$:

$$A = \frac{\sum_i w_i \,\min(a_i/t_i,\,1)^{p}}{\sum_i w_i}, \qquad p = 2.5$$

$$S = 100\,(0.65A + 0.15C + 0.10\,\mathrm{Style} + 0.10\,k) - 15\cdot\#\text{missed must-haves} + 3\cdot\text{fitting room} + \tfrac14\text{charm} + \text{season} \;(+2 \text{ if loyal})$$

Here $C$ is the colour match (loved = 1, neutral = 0.55, disliked = 0, with the accent colour counting 30%). Style is 1 if the silhouette is one the customer fancies, otherwise 0.5. $k \in [0,1]$ is the stitching accuracy. Quality is also multiplied by $0.85 + 0.25k$.

Payment is the full budget for $S \ge 75$. Between 40 and 75 it falls linearly to 40% of the budget, and below 40 it is 40%. A tip of $\text{budget}\cdot(S-85)/100$ is added for $S > 85$. Reputation changes by $(S-70)/12$.

Fabric prices follow a mean-reverting AR(1) in log space: $\ln m_{t+1} = 0.65 \ln m_t + 0.1\,\varepsilon_t$, clamped to $[0.7, 1.45]$.

## Project layout

```
index.html          page shell
css/style.css       all styling (touch-first, iPad landscape + portrait)
js/data.js          fabrics, dress parts, notions, upgrades, customer types
js/logic.js         market, customers, dress analysis, scoring (pure, runs in Node too)
js/render.js        SVG dress-on-dress-form renderer, swatches, portraits
js/audio.js         synthesised sound effects and music
js/profiles.js      players, per-player saves, settings, save codes
js/minigames.js     cutting, ironing, kneading and pot-painting mini-games
js/ui.js            screens, input handling, stitching and wheel mini-games
tests/              balance and render sanity checks (npm test)
tools/              single-file build
```
