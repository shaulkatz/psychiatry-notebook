'use strict';
const reconstructionSets = [];
function addSet(set, items) {
  reconstructionSets.push(set);
  chapters[set.id] = {sections: topics.map(([id, title]) => [id, title, []])};
  for (const [number, page, q, a, k, e, x, section] of items)
    questions.push({id: set.id + '-' + number, topic: set.id, section, number, page, q, a, k, e, x});
}
