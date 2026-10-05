# Mie's Atelier 🧵👗

A browser game made mainly for iPad. Mie runs a small dress atelier in Copenhagen. Customers come in with wishes, she buys fabric at the market, and you design and sew the dress. Then you see how happy the customer is.

No build step and no dependencies. It is plain HTML, CSS and JavaScript.

## Play

- **Locally:** open `index.html` in a browser, or run `npm start` and go to http://localhost:5173.
- **On iPad:** host it on GitHub Pages (Settings → Pages → deploy from `main`, root folder), open it in Safari, then choose *Share → Add to Home Screen*. It then opens full screen like an app.
- **Single file:** `npm run build` writes `dist/mies-atelier.html`. That one file works anywhere, for example from AirDrop or iCloud Drive.

Progress is saved automatically in the browser (`localStorage`).

## How a day works

1. **Shop:** customers wait in the shop. Each has
   - wishes, rated 1–3 ♥, across six qualities: quality, workwear, creativity, exclusivity, elegance and comfort
   - must-haves, such as pockets, long sleeves or floor length
   - colours they love and dislike, silhouettes they prefer, and a budget.
2. **Market:** buy fabric by the metre and notions (zippers, buttons, ribbon, lace trim, sequins, embroidery thread, crystals). Fabric prices move every morning, and some days have a sale.
3. **Workshop:** pick the main and accent fabric, colours, silhouette, length, neckline, sleeves, closure and extras. The dress preview and the stat bars update live. A black mark on a bar shows the customer's wish for that quality. More than three decorations make a dress look over-done.
4. **Sewing:** tap *Stitch!* when the needle is over the green zone, five times. Neat stitching raises quality.
5. **Result:** satisfaction decides payment, tip and reputation, and whether the customer comes back. Regulars return with new requests and bigger budgets.
6. **Close the shop:** pay rent, and a new day begins.

Reputation unlocks new kinds of customers, ending with wedding guests, influencers, gala guests and brides.

## Spending money

Besides fabric and notions, the **Upgrades** screen has five tabs: Equipment, Expansion (pottery studio, upstairs floor, described below), Decor, Staff and Marketing.

| Tab | What you buy | Effect |
|---|---|---|
| Equipment | Sewing machine, shop window, supplier network, embroidery machine, market haggling, fitting room | Better stitching, more and richer customers, premium fabrics, embroidery and beading, cheaper market, higher satisfaction. Each level adds 10 kr to the daily rent. |
| Decor | Plant, window flowers, rug, mirror, sketch gallery, espresso machine, armchair, neon sign, chandelier, and four wallpapers | Each item appears in the shop scene and adds **charm**. Every charm point gives +0.25 satisfaction, +1% customer budgets and a better chance of rack sales. |
| Staff | Oskar the apprentice (300 kr + 50 kr/day), Lise the shop assistant (400 kr + 70 kr/day) | Oskar: 10% less fabric per dress and a wider stitch zone. Lise: one more customer per day, and no reputation loss for customers you could not help. |
| Marketing | Flyers, newspaper ad, influencer shout-out, fashion show | Paid today, works tomorrow: extra customers, bigger budgets, a guaranteed high-end client, or an immediate reputation boost. |

The **ready-to-wear rack** on the Shop screen lets Mie sew a dress without an order, which is a good way to use leftover fabric. The price tag is $0.9\cdot\text{materials} + 18\cdot\text{appeal}$, where appeal is the mean of the dress's three best stats. Each evening every rack dress sells with probability $\min(0.85,\ 0.25 + 0.03\cdot\text{charm} + 0.05\cdot\text{shop window level})$. Dresses that don't sell can be marked down.

## Seasons

Every 7 days the season changes: spring → summer → autumn → winter, starting in spring. The view through the shop window changes with it.

- **Customers:** each season changes who comes in. Picnics in summer, galas and cozy winter dresses in winter, workers and office dresses in autumn, wedding guests in spring and summer.
- **Market:** in-season fabrics cost 12% more and off-season fabrics 15% less. You can buy wool cheap in July and keep it for winter.
- **Satisfaction:** a main fabric that is in season gives +3. An off-season one (wool in summer, linen in winter) gives −4.

## Pottery studio

Buy the **Pottery studio** under Upgrades → Expansion (600 kr, level 2 for 1.500 kr). In the Pottery screen you:

1. Pick a shape (cup, bowl, plate, vase, teapot), a clay (terracotta, stoneware, porcelain), a glaze and a decoration. Clay, glazes and gold leaf are sold at the market.
2. **Throw it on the wheel:** hold the button to press on the clay and let go to ease off. Keep the marker inside the moving green band while the pot rises. Harder shapes move the band faster and make it narrower.
3. The pot goes into the **kiln** and is fired overnight. The crack risk is $0.32\,(1-\text{score})\cdot\text{difficulty}$, halved with the electric kiln, and between 3% and 60%.
4. Pots that survive go on the **shelf**. Each sells with probability $\min(0.8,\ 0.3 + 0.02\cdot\text{charm})$ per evening. Up to 3 pots on display add charm to the shop.

Price: $\text{shape base}\cdot\text{clay}\cdot\text{glaze}\cdot\text{decoration}\cdot(0.6 + 0.8\cdot\text{score})$.

## Upstairs floor and goals

- **Upstairs floor** (2.500 kr, +40 kr/day rent): +2 customers per day and +2 rack hangers.
- **Goals:** 16 milestones with cash rewards, such as your first dress, 5 workwear dresses, a 95% masterpiece, a teapot that survives the kiln, all four seasons, and a bride's dress. Goals stay complete once reached. Collect the rewards on the Goals screen.

## Scoring model

For a customer with weights $w_i$ and targets $t_i$, and dress stats $a_i \in [0,10]$:

$$A = \frac{\sum_i w_i \,\min(a_i/t_i,\,1)^{p}}{\sum_i w_i}, \qquad p = 2.5$$

$$S = 100\,(0.65A + 0.15C + 0.10\,\mathrm{Style} + 0.10\,k) - 15\cdot\#\text{missed must-haves} + 3\cdot\text{fitting room} + \tfrac14\text{charm} + \text{season} \;(+2 \text{ if loyal})$$

Here $C$ is the colour match (loved = 1, neutral = 0.55, disliked = 0, with the accent colour counting 30%). Style is 1 if the silhouette is one the customer fancies, otherwise 0.5. $k \in [0,1]$ is the stitching accuracy. Quality is also multiplied by $0.85 + 0.25k$.

Payment is the full budget for $S \ge 75$. Between 40 and 75 it falls linearly to 40% of the budget, and below 40 it is 40%. A tip of $\text{budget}\cdot(S-85)/100$ is added for $S > 85$. Reputation changes by $(S-65)/8$.

Fabric prices follow a mean-reverting AR(1) in log space: $\ln m_{t+1} = 0.65 \ln m_t + 0.1\,\varepsilon_t$, clamped to $[0.7, 1.45]$.

## Project layout

```
index.html          page shell
css/style.css       all styling (touch-first, iPad landscape + portrait)
js/data.js          fabrics, dress parts, notions, upgrades, customer types
js/logic.js         market, customers, dress analysis, scoring (pure, runs in Node too)
js/render.js        SVG dress-on-dress-form renderer, swatches, portraits
js/ui.js            screens, input handling, sewing mini-game
tests/              balance and render sanity checks (npm test)
tools/              single-file build
```
