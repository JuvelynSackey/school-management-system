// Reshapes one question into exactly what a student attempting it is
// allowed to see -- never the raw Question document. Every returned
// "index" refers to the question's ORIGINAL array position (options/
// matchingPairs/orderItems), regardless of display order, since that's
// what assessmentGrading.service.js expects a submitted response to use.
// displayOrder (from the attempt's own displayOrderByQuestion snapshot)
// only controls the ORDER these are listed in, never which data appears.
const redactQuestionForStudent = (question, displayOrder) => {
  const base = {
    id: question.id,
    topic: question.topic,
    type: question.type,
    marks: question.marks,
    promptText: question.promptText,
  };

  if (question.type === 'mcq' || question.type === 'true_false' || question.type === 'multi_select') {
    const order = displayOrder?.length === question.options.length ? displayOrder : question.options.map((_, i) => i);
    return { ...base, options: order.map((i) => ({ index: i, text: question.options[i].text })) };
  }
  if (question.type === 'matching') {
    const pairs = question.matchingPairs || [];
    const rightOrder = displayOrder?.length === pairs.length ? displayOrder : pairs.map((_, i) => i);
    return {
      ...base,
      leftItems: pairs.map((p, i) => ({ index: i, text: p.left })),
      rightItems: rightOrder.map((i) => ({ index: i, text: pairs[i].right })),
    };
  }
  if (question.type === 'ordering') {
    const items = question.orderItems || [];
    const order = displayOrder?.length === items.length ? displayOrder : items.map((_, i) => i);
    return { ...base, items: order.map((i) => ({ index: i, text: items[i] })) };
  }
  if (question.type === 'fill_in_blank') {
    return { ...base, blankCount: (question.blanks || []).length };
  }
  // essay, file_upload -- nothing type-specific to redact or expose
  return base;
};

// Strips grading data from an already-JSON-serialized attempt (call
// attempt.toJSON() before this, so idTransformPlugin's id/virtuals are
// already applied the same way a direct res.json() would). `released`
// gates whether the student is allowed to see how they did yet, per
// Assessment.resultRelease -- an attempt they can still edit or one that's
// awaiting release shows their own responses back but never a score.
const redactAttemptForStudent = (attemptJson, released) => ({
  ...attemptJson,
  answers: (attemptJson.answers || []).map((a) => ({
    questionId: a.questionId,
    response: a.response,
    ...(released ? { isCorrect: a.isCorrect, marksAwarded: a.marksAwarded } : {}),
  })),
  autoScore: released ? attemptJson.autoScore : null,
  totalScore: released ? attemptJson.totalScore : null,
  totalPossibleMarks: released ? attemptJson.totalPossibleMarks : null,
  displayOrderByQuestion: undefined,
});

module.exports = { redactQuestionForStudent, redactAttemptForStudent };
