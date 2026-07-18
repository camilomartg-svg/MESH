const ts = Date.now();
const t1 = { id: 'M013', durationDays: 3, activationTimestamp: ts - 100000 }; // edited yesterday
const t2 = { id: 'M012', durationDays: 0 }; // inactive

// User edits M012
const t2_edited = { ...t2, durationDays: 1, activationTimestamp: ts }; // edited today

const unifiedList = [t1, t2_edited].map(t => ({
  id: t.id,
  activationTimestamp: t.activationTimestamp || (t.durationDays > 0 ? 1 : 0),
  durationDays: t.durationDays
}));

const sequentialItems = unifiedList.filter(i => i.durationDays > 0);
sequentialItems.sort((a,b) => {
  if (a.activationTimestamp !== b.activationTimestamp) return a.activationTimestamp - b.activationTimestamp;
  return a.id.localeCompare(b.id, 'en', {numeric: true});
});

console.log(sequentialItems);
