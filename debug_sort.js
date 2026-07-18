const projectStart = '2026-07-17';
const busyPeriods = {};
const resolvedSchedules = {};

function addWorkingDays(start, days) {
  return { start: '2026-07-21', end: '2026-07-23' }; // dummy
}

const unifiedList = [
  { id: 'M013', assigneeId: 'c1', activationTimestamp: 445281, durationDays: 3, isParallel: false },
  { id: 'M012', assigneeId: 'c1', activationTimestamp: 461250, durationDays: 1, isParallel: false },
  { id: 'M010', assigneeId: 'c1', activationTimestamp: 794017, durationDays: 1, isParallel: true, parallelWithId: 'M012' },
  { id: 'M011', assigneeId: 'c1', activationTimestamp: 794023, durationDays: 1, isParallel: true, parallelWithId: 'M012' }
];

const sequentialItems = unifiedList.filter(item => item.activationTimestamp > 0 && item.durationDays > 0);

sequentialItems.sort((a, b) => {
  if (a.activationTimestamp !== b.activationTimestamp) return a.activationTimestamp - b.activationTimestamp;
  return a.id.localeCompare(b.id, 'en', { numeric: true });
});

console.log('Sort order:');
sequentialItems.forEach(i => console.log(i.id, i.activationTimestamp));
