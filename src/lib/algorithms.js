// TODO: implement algorithms.js
const BROWNS_CN = 60;
const GREENS_CN = 15;

export function calculateCNRatio(greensKg, brownsKg) {
  if (greensKg === 0 && brownsKg === 0) return null;

  const totalCarbon = (greensKg * GREENS_CN) + (brownsKg * BROWNS_CN);
  const totalNitrogen = greensKg + brownsKg;

  if (totalNitrogen === 0) return null;

  return parseFloat((totalCarbon / totalNitrogen).toFixed(2));
}

export function calculateMaturity(cnRatio) {
  if (cnRatio === null || cnRatio === undefined) return "unknown";
  if (cnRatio > 35) return "immature";
  if (cnRatio >= 25 && cnRatio <= 35) return "mature";
  return "nitrogen-heavy";
}

export function getCNFeedback(cnRatio) {
  if (cnRatio === null) return "Add some waste to get started.";
  if (cnRatio > 35) return "Too many browns! Add more food scraps or greens.";
  if (cnRatio >= 25 && cnRatio <= 35) return "Perfect balance! Your pile is happy.";
  return "Too many greens! Add more cardboard or dry leaves.";
}