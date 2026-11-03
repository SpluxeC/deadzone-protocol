import test from 'node:test';import assert from 'node:assert/strict';import {produceSupplies} from './survival.ts';
test('operational farms and water collectors sustain a growing FOB',()=>{
 const a={population:6,farms:1,collectors:1,storage:1,farmStaff:2,waterStaff:2};
 let stock={food:8,water:8};for(let i=0;i<8;i++)stock=produceSupplies(stock,a);
 assert.ok(stock.food>=8&&stock.water>=8);assert.ok(stock.food<=40&&stock.water<=40);
});
test('disabled production causes shortages but never negative resources',()=>{
 let stock={food:4,water:4};const base={population:8,farms:0,collectors:0,storage:0,farmStaff:0,waterStaff:0};
 for(let i=0;i<4;i++)stock=produceSupplies(stock,base);assert.deepEqual(stock,{food:0,water:0});
});
test('capacity is respected when supply generation is high',()=>{
 assert.deepEqual(produceSupplies({food:19,water:20},{population:0,farms:10,collectors:10,storage:0,farmStaff:4,waterStaff:4}),{food:20,water:20});
});
