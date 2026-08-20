const { Payment, Fee } = require('../models');

const getFeeBalance = async (fee) => {
  const payments = await Payment.find({ feeId: fee.id });
  const amountPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const balance = Number(fee.amountDue) - amountPaid;
  let status = 'Pending';
  if (amountPaid > 0 && balance > 0) status = 'Partial';
  if (balance <= 0) status = 'Paid';
  return { amountPaid, balance, status };
};

const getOutstandingBalanceForStudentTerm = async (studentId, academicTermId) => {
  const fees = await Fee.find({ studentId, academicTermId });
  const balances = await Promise.all(fees.map(getFeeBalance));
  return balances.reduce((sum, b) => sum + Math.max(b.balance, 0), 0);
};

const refreshFeeStatus = async (fee) => {
  const { status } = await getFeeBalance(fee);
  if (fee.status !== status) {
    fee.status = status;
    await fee.save();
  }
  return status;
};

module.exports = { getFeeBalance, refreshFeeStatus, getOutstandingBalanceForStudentTerm };
