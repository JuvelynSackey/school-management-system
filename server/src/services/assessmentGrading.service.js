// Every grading function here operates on ORIGINAL indices (into
// question.options/matchingPairs/orderItems), never display-shuffled
// positions -- the client translates a shuffled selection back to its
// original index immediately on input, using the attempt's own
// displayOrderByQuestion snapshot, so grading never needs to know whether
// or how a question was shuffled for display.

const gradeMcqOrTrueFalse = (question, response) => {
  const correctIndex = question.options.findIndex((o) => o.isCorrect);
  const isCorrect = Number.isInteger(Number(response)) && Number(response) === correctIndex;
  return { isCorrect, marksAwarded: isCorrect ? question.marks : 0 };
};

const gradeMultiSelect = (question, response) => {
  const correctSet = new Set(question.options.map((o, i) => (o.isCorrect ? i : null)).filter((i) => i !== null));
  const responseSet = new Set(Array.isArray(response) ? response.map(Number) : []);
  const isCorrect = correctSet.size === responseSet.size && [...correctSet].every((i) => responseSet.has(i));
  return { isCorrect, marksAwarded: isCorrect ? question.marks : 0 };
};

// Partial credit, proportional to how many left items ended up paired with
// their real right side. response[leftIndex] = the right-side index the
// student chose for that left item; a pairing is correct exactly when
// response[i] === i, since matchingPairs[i].right is by construction the
// right answer for matchingPairs[i].left.
const gradeMatching = (question, response) => {
  const pairs = question.matchingPairs || [];
  const answered = Array.isArray(response) ? response : [];
  const correctCount = pairs.reduce((count, _, i) => count + (Number(answered[i]) === i ? 1 : 0), 0);
  const isCorrect = pairs.length > 0 && correctCount === pairs.length;
  const marksAwarded = pairs.length > 0 ? Math.round((correctCount / pairs.length) * question.marks) : 0;
  return { isCorrect, marksAwarded };
};

// Partial credit, proportional to how many positions match the correct
// order. response[position] = the original index of the item the student
// placed there; correct order means response[k] === k for every k.
const gradeOrdering = (question, response) => {
  const items = question.orderItems || [];
  const answered = Array.isArray(response) ? response : [];
  const correctCount = items.reduce((count, _, i) => count + (Number(answered[i]) === i ? 1 : 0), 0);
  const isCorrect = items.length > 0 && correctCount === items.length;
  const marksAwarded = items.length > 0 ? Math.round((correctCount / items.length) * question.marks) : 0;
  return { isCorrect, marksAwarded };
};

// Partial credit per blank, case-insensitive against that blank's
// acceptedAnswers list.
const gradeFillInBlank = (question, response) => {
  const blanks = question.blanks || [];
  const answered = Array.isArray(response) ? response : [];
  const correctCount = blanks.reduce((count, blank, i) => {
    const given = String(answered[i] || '').trim().toLowerCase();
    const matches = given.length > 0 && (blank.acceptedAnswers || []).some((a) => String(a).trim().toLowerCase() === given);
    return count + (matches ? 1 : 0);
  }, 0);
  const isCorrect = blanks.length > 0 && correctCount === blanks.length;
  const marksAwarded = blanks.length > 0 ? Math.round((correctCount / blanks.length) * question.marks) : 0;
  return { isCorrect, marksAwarded };
};

// Grades one answer against its question. essay/file_upload are never
// auto-graded -- returns needsManualGrading instead of a score.
const gradeAnswer = (question, response) => {
  if (question.type === 'essay' || question.type === 'file_upload') {
    return {
      isCorrect: null, marksAwarded: null, needsManualGrading: true,
    };
  }
  let result;
  if (question.type === 'mcq' || question.type === 'true_false') result = gradeMcqOrTrueFalse(question, response);
  else if (question.type === 'multi_select') result = gradeMultiSelect(question, response);
  else if (question.type === 'matching') result = gradeMatching(question, response);
  else if (question.type === 'ordering') result = gradeOrdering(question, response);
  else if (question.type === 'fill_in_blank') result = gradeFillInBlank(question, response);
  else result = { isCorrect: null, marksAwarded: 0 };
  return { ...result, needsManualGrading: false };
};

// Grades every answer in an attempt. questionsById is a Map<string, Question>
// (already fetched, tenant-scoped, populated by the caller) -- this
// function does no DB access itself.
const gradeAttempt = (answers, questionsById) => {
  let autoScore = 0;
  let totalPossibleMarks = 0;
  let needsManualGrading = false;

  const gradedAnswers = answers.map((answer) => {
    const question = questionsById.get(answer.questionId.toString());
    if (!question) return answer;
    totalPossibleMarks += question.marks;
    const graded = gradeAnswer(question, answer.response);
    if (graded.needsManualGrading) needsManualGrading = true;
    else autoScore += graded.marksAwarded || 0;
    return {
      questionId: answer.questionId,
      response: answer.response,
      isCorrect: graded.isCorrect,
      marksAwarded: graded.marksAwarded,
      needsManualGrading: graded.needsManualGrading,
    };
  });

  return {
    gradedAnswers, autoScore, totalPossibleMarks, needsManualGrading,
  };
};

module.exports = { gradeAnswer, gradeAttempt };
