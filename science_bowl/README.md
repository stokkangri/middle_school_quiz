# Science Bowl practice (middle school)

Practice set for the [National Science Bowl](https://science.osti.gov/wdts/nsb/Regional-Competitions/Resources/MS-Sample-Questions) middle school sample questions. Open `index.html` from a local web server. The quiz reads `questions.json`.

The bank is the Department of Energy sample rounds from 2019, 2020, 2021, and 2022. DOE says to use those files as sample questions, because some answers change as science advances.

At the start, choose category, multiple choice or short answer, toss-up or bonus, and how many questions. You can also pick one official round and play it in order, toss-up then bonus. Choices stay in official W–X–Y–Z order. Skip leaves a question blank so it can be answered later. Reveal shows the answer and that question scores 0. The results page shows points, category performance, and every answer.

Short answers ignore capitalization. `the` at the start does not matter. Decimals, fractions, and forms like `x^2` and `x²` are treated as the same when the sample set accepts them.

## Run it

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765`.

## Rebuild the bank

```bash
python3 tools/build_bank.py
```

That downloads the sample-round PDFs into `source_pdfs/` (kept out of git) and rewrites `questions.json`.
