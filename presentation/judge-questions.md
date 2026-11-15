# Weather Witness: if the judges ask about the stack or the prediction

Short answers to say out loud. Ahmed answers the questions about the stack, Manayer the ones about the prediction. Every answer here is true for the project as it is built, so it will hold up if a judge opens the site or the code.

## The stack

**What is it built with?**
"It is a web app in React and TypeScript, built with Vite. The data comes live from NASA's POWER API. Our own trend engine does the statistics. It is served from GitHub Pages, and GitHub Actions rebuilds it every time we change the code."

**Where does the data come from?**
"From NASA's servers, live. When you pick a city, the app asks NASA's POWER API for 45 years of daily weather for that exact spot. That is about 16,000 days, and it takes about three seconds."

**Do you have your own backend or server?**
"We do not run our own backend, and that was a choice. The app talks straight to NASA's servers and is served from GitHub's. So every number is always NASA's latest, nothing about the visitor is stored, and the site costs nothing to run for any of 6,266 cities."

**Where do the calculations happen?**
"In the app itself, on the visitor's device. We wrote the trend engine in TypeScript. To be sure it is right, we checked it against the standard Python science packages, SciPy and pymannkendall, with 123 automatic tests."

**What happens if NASA's service is down?**
"Four demo cities are bundled with the site, Kuwait City, London, Sydney and Delhi, so those open instantly without NASA. Any other city needs NASA's service."

**Did AI build this?**
"AI helped write the code. No AI runs in the site. Every number is computed from NASA data with ordinary statistics."

## The prediction

**How do you predict the future?**
"Three steps. One: we test the past. We take one value per year, 45 years, and run a Mann-Kendall test. Only a real change goes further. Two: we measure the pace with Sen's slope, which tells us how much it changes every ten years. Three: we continue that straight line to a child born in 2030, 2040 or 2050, and average their first ten years."

**Is it a forecast?**
"No. It is a what-if. It is a straight line drawn from 45 years of measurements, not a climate model. The site labels it 'What-if, not a forecast', and so do we."

**Why two futures?**
"One line keeps the same pace as the last 45 years. The other goes at half that pace. Half is only an example we picked to show that slowing down matters. It is not a scenario from climate science, and the site says 'example' next to it."

**What is the Mann-Kendall test?**
"It checks if the years go steadily in one direction, or just jump up and down. It does not care about one crazy year. If it is very unlikely to be chance, less than 5 percent, we stamp it 'Real change'. If not, we stamp it 'No clear change' and still show it."

**What is Sen's slope?**
"It is the typical change per year. It looks at every pair of years and takes the middle value, so one extreme year cannot pull the line."

**How sure are you about the 2040 numbers?**
"We show a range, not just one number. The range comes from the 95 percent confidence interval on the slope. For Kuwait City, a child born in 2040 gets about 87 unusually hot days a year, somewhere between 82 and 92."

**Why a straight line? The climate is not a straight line.**
"True, and that is why we call it a what-if. A straight line is the simplest honest thing the data supports. The challenge itself says detecting linear trends is a great start."

**What does the prediction leave out?**
"Three things. It cannot see new policies or new technology. It is one square of about 50 kilometres, not your street. And we only draw it for measures with a real trend: where there is no clear change, there is no line to extend."

## Numbers to have ready

| Number | What it is |
|---|---|
| 45 | years of daily NASA data, 1981 to 2025 |
| about 16,000 | days of weather per city (16,436) |
| about 3 seconds | to load any city live from NASA |
| 6,266 | cities in the search |
| 123 | automatic tests |
| 5 percent | the cut-off for "Real change" |
| 95 percent | the confidence range shown with each trend |
| 87 (82 to 92) | hot days a year for a Kuwait City child born in 2040, same pace |
| 77 (74 to 79) | the same child if the pace halves |
| 69 | hot days a year for a child born in 2015, measured |
