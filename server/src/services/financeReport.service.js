const {
  Fee, Payment, Class,
} = require('../models');
const { getFeeBalance } = require('./fees.service');

// Aggregate financial-health summary — total assigned/collected/outstanding,
// broken down by fee category, by class (arrears only, for chasing debtors),
// and by payment method. Reuses getFeeBalance (same per-fee payment lookup
// the existing /reports/fees CSV export already uses) rather than a second
// definition of "balance".
const buildFinanceSummary = async ({ academicTermId } = {}) => {
  const feeWhere = {};
  if (academicTermId) feeWhere.academicTermId = academicTermId;

  const fees = await Fee.find(feeWhere).populate('student', 'classId firstName lastName');
  const balances = await Promise.all(fees.map(getFeeBalance));

  const totalAssigned = fees.reduce((sum, f) => sum + Number(f.amountDue), 0);
  const totalCollected = balances.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalOutstanding = balances.reduce((sum, b) => sum + Math.max(b.balance, 0), 0);

  const categoryMap = new Map();
  fees.forEach((f, i) => {
    const row = categoryMap.get(f.category) || { category: f.category, assigned: 0, collected: 0 };
    row.assigned += Number(f.amountDue);
    row.collected += balances[i].amountPaid;
    categoryMap.set(f.category, row);
  });

  const classes = await Class.find({}, { name: 1, section: 1 });
  const classLabelById = new Map(classes.map((c) => [c.id, `${c.name} ${c.section || ''}`.trim()]));

  const classMap = new Map();
  fees.forEach((f, i) => {
    const classId = f.student?.classId ? f.student.classId.toString() : null;
    const key = classId || 'unassigned';
    const label = classId ? (classLabelById.get(classId) || 'Unknown Class') : 'Unassigned';
    const row = classMap.get(key) || { classId: key, className: label, arrears: 0 };
    row.arrears += Math.max(balances[i].balance, 0);
    classMap.set(key, row);
  });

  const feeIds = fees.map((f) => f.id);
  const payments = feeIds.length > 0 ? await Payment.find({ feeId: { $in: feeIds } }) : [];
  const methodMap = new Map();
  payments.forEach((p) => {
    const row = methodMap.get(p.paymentMethod) || { method: p.paymentMethod, total: 0, count: 0 };
    row.total += Number(p.amountPaid);
    row.count += 1;
    methodMap.set(p.paymentMethod, row);
  });

  return {
    totalAssigned,
    totalCollected,
    totalOutstanding,
    byCategory: [...categoryMap.values()],
    byClass: [...classMap.values()].sort((a, b) => b.arrears - a.arrears),
    byMethod: [...methodMap.values()],
  };
};

module.exports = { buildFinanceSummary };
