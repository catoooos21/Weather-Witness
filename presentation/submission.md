# Weather Witness: text for the NASA Space Apps submission page

Copy each block into the matching field on your team's project page. Everything is in English, as required.

---

## Project Name

Weather Witness

---

## High-Level Project Summary

Weather Witness turns 45 years of NASA daily weather data into something anyone can read: two childhoods in the same city, side by side. Pick any of 6,266 cities, or any point on Earth, and two birth years. The site compares the first ten years of each life: unusually hot days, warm nights, rain, humidity, dust and the ground. Every number goes through a Mann-Kendall trend test with Sen's slope and is stamped "Real change" or "No clear change", so people can tell a real trend from a few bad years. It answers the challenge's four questions (what is changing, where, how much, and whether it is significant) in everyday words, for parents, outdoor workers, farmers and teachers. In Kuwait City, a child born in 2015 gets 57 more unusually warm nights a year than one born in 1981.

---

## Link to Project Demo

[ public link to the 7-slide deck or the 30-second video: see the note at the end ]

---

## Link to Final Project

https://catoooos21.github.io/Weather-Witness/

---

## Detailed Project Description

**What it does.** Weather Witness is a website that lets anyone investigate how the weather where they live has changed, without reading a chart or a data file. You pick a city and two birth years (for example 1981 and 2015). The site lays out two scrapbook pages: "Then" on the left, "Now" on the right, and sticky notes in the middle that say what changed, by how much, and whether the change is real. Tap any number to see every year since 1981 with its trend line.

**Who it is for.** The same data answers different questions for different lives, so visitors choose who they are: kid or parent, outdoor worker, farmer, runner, older person, or traveller, or pick their own measures.

**How it works.**
1. Data: the site asks the NASA POWER API for 45 years of daily weather (1981–2025) at the chosen point, about 16,000 days, in about three seconds. A "What NASA sends us" button shows one real day of that raw data, so visitors see what the site translates.
2. Measures: from those days it counts 18 measures in plain language, such as unusually hot days and warm nights (judged against each city's own 1981–2010 weather), heatwave days, rainy days, the longest dry spell, sticky days and perfect outdoor days.
3. Statistics: for each measure it builds one value per year and runs a Mann-Kendall trend test with the Hamed and Rao correction for autocorrelation, plus Sen's slope with a 95 % confidence interval. p < 0.05 is stamped "Real change"; anything else is "No clear change", and is still shown.
4. More evidence: a second opinion on rain from NASA's GPM satellites, dust and haze from NASA CERES, and the ground under the city (surface temperature, soil wetness, evaporation) from MERRA-2.
5. Two futures: for measures with a real trend, the line is continued to a child born in 2030, 2040 or 2050, once at the same pace and once at half the pace. It is labelled as a what-if, not a forecast.
6. Context: the cost side (cooling and heating degree-days, plus published estimates of income lost to heat), a second city side by side (for example Kuwait City and London), and where the country stands on its CO₂ emissions.

**Why it matters.** Heat kills hundreds of thousands of people a year, yet the data that shows how fast it is changing sits in files most people never open. Weather Witness makes that evidence personal, local and honest, including its limits: it is a NASA model fed by observations, one grid square of about 50 km stands for a whole city, and rain is less certain than temperature. The site says so on the page.

**What we hope to achieve.** A tool that a parent, a teacher or a city planner can open in a minute and trust, with ocean data for coastal cities and data from partner space agencies as the next steps.

**Tools.** TypeScript and React, built with Vite and served from GitHub Pages, deployed by GitHub Actions. The statistics are written in TypeScript and checked against the Python packages SciPy and pymannkendall by 123 automatic tests (Vitest); a Python reference implementation (NumPy, pandas, SciPy, pymannkendall) generated the test values. Code: https://github.com/catoooos21/Weather-Witness

---

## NASA Data

- **NASA POWER daily point API, MERRA-2 meteorology**, 1981–2025: daily maximum, minimum and mean temperature at 2 m (T2M_MAX, T2M_MIN, T2M), dew point (T2MDEW), precipitation (PRECTOTCORR) and relative humidity (RH2M). This is the core of every number on the site.
- **NASA GPM IMERG precipitation** (IMERG_PRECTOT, through NASA POWER), 1998–2025: a satellite second opinion on the five rain measures, with the same trend test.
- **NASA CERES SYN1deg aerosol optical depth** (AOD_55, through NASA POWER), 2001–2025: dust and haze.
- **MERRA-2 land surface** (through NASA POWER): surface (skin) temperature, surface soil wetness and evaporation, for "The ground" under each city.
- **NASA GISTEMP v4** global annual mean temperature: to compare each city's warming with the world's.
- **NASA Science climate pages** (causes, evidence, ocean warming) for the context text.

---

## Space Agency Partner & Other Data

- **City list:** GeoNames, cities over 100,000 people (CC BY 4.0).
- **CO₂ emissions by country:** Global Carbon Budget via Our World in Data (CC BY 4.0).
- **Published figures quoted with their source:** World Health Organization (heat deaths, 2000–2019 average); noheatstroke.org, San José State University (children in hot cars); UNICEF, Beat the Heat (2024); Saudi Ministry of Health (Hajj 2024); The Lancet Countdown on health and climate change (2024); International Labour Organization, Working on a Warmer Planet (2019); Kuwait EPA, National Communication to the UNFCCC (2019); ORF, Energy transitions in the Gulf (2025); Net Zero Tracker; Climate Home News; NS Energy; US EPA, heat island reduction; Al-Rashidi et al., Natural Hazards (2009), Kuwait Bay sea surface temperature.
- **Methods:** Hamed and Rao (1998), Journal of Hydrology 204; Sen (1968), JASA 63; the outdoor-days idea of Choi, Khalifa and Eltahir (2024), Journal of Climate.
- **Video footage:** two Pexels clips (parked car interior, video 3757013; lighter, video 2548212), Pexels licence.
- **Software:** React, Vite, TypeScript, Vitest; NumPy, pandas, SciPy, pymannkendall; FFmpeg and Pillow for the video.
- No partner space agency data is used yet; adding it is a next step.

---

## Use of Artificial Intelligence

Yes. We used Claude (Anthropic) as a coding and writing assistant throughout the hackathon. It wrote most of the website code, the TypeScript version of the trend statistics and the 123 tests that check it against the Python packages, and the data-fetch scripts. It also drafted the README, the presentation slides and the speaker script, and edited the demo video; the video carries an "Edited with AI assistance" label on every frame. The team chose the concept, the measures, the statistical tests and the limits, checked the numbers, and is responsible for the scientific interpretation. No AI model runs inside the website: every number is computed from NASA data with standard statistics. We used no AI-generated images, and no NASA logos or branding.

---

## Before you press "Submit for Judging"

- Fill in the team name on slide 1 of the deck, and on the team page.
- All five members must be confirmed participants at the same Local Event.
- The demo link must open for anyone, with no sign-in or permission request.
- Tick the two boxes yourself (Terms and Conditions, and Confirm All Work is Original), then press "Submit for Judging" before 11:59 p.m. local time of your event. Submission is final.
