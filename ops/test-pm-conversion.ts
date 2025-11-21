const match = 'p.m.';

const isPM = /p\.\s*m\./i.test(match);
console.log('isPM:', isPM);

let hour = 7;
console.log('Hour before conversion:', hour);

if (isPM && hour !== 12) {
  hour += 12;
} else if (!isPM && hour === 12) {
  hour = 0;
}

console.log('Hour after conversion:', hour);
console.log('Expected: 19');
