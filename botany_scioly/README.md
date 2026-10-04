# Botany practice (Science Olympiad 2027, Division B)

Practice set for middle school Botany. Open `index.html` from a local web server or from GitHub Pages. The quiz reads `questions.json`.

At the start, choose difficulty, topic or all topics, how many questions, and whether correct answers show after each question or only at the end. Questions are drawn at random. Skip leaves a question blank so it can be answered later. Reveal shows the answer and that question scores 0. The results page shows points, topic and difficulty performance, and every answer.

## Add a question

1. Ask an LLM to turn your question into one JSON object using the prompt below.
2. Paste the object into the **questions** array in `questions.json`, with a comma between objects. Keep the `id` unique.
3. Refresh the quiz. Or paste the JSON into **Add questions for this practice**, then use **Download this bank** and replace `questions.json` if you want to keep it.

### Prompt

```
Write ONE original middle school Science Olympiad Botany B practice question as a single JSON object and nothing else.
Season 2027 Division B. Do not copy official test wording.
Use a new id. difficulty is "easy", "medium", or "hard".
topic must be one of: plant_cells, roots, stems, leaves, spores, flowers_seeds, growth, transport, plant_groups, history, genetics, photosynthesis, taxonomy, evolution, cycles, plant_uses, competition, gmos, food_products, diseases.
type must be one of: multiple_choice, multi_select, true_false, free_response, label, data_analysis.
Include a short explanation a 6th–8th grader can learn from.
multiple_choice: options array and answer string that exactly matches one option.
multi_select: options array and answer array of the correct option strings.
true_false: answer is true or false, not a string.
free_response: answer string plus accept array of allowed phrases.
label: diagram is flower, seed, root_tip, or leaf, or include an svg string. labels is [{ "key": "A", "answer": "petal", "accept": ["petal"] }]. Optional wordBank.
data_analysis: include chart or table, plus options and answer for a choice question, or answer and accept for a typed question.
chart types: bar with points [{label, value}], line with series [{name, points:[{label, value}]}], grouped_bar with groups and series [{name, values}].
```

Graph numbers in this bank are practice patterns for coaching, not measurements from a published study.
