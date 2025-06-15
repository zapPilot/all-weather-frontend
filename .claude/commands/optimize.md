1. read the whole project if needed. If you decide to read the whole project then remember to update CLAUDE.md
2. check the todo tasks to do from LOW_HANGING_FRUIT.md, it's ok to do it step by step. But prioritize memory optimization improvement first even tho that task's priority is not the highest in LOW_HANGING_FRUIT.md. `doppler run -- yarn dev` is using too much RAM on my laptop.
3. Always validate the result by runing `doppler run -- yarn coverage` or `doppler run -- npx vitest __tests__/<file>`
4. Add new test cases if the test coverage is running below
5. update LOW_HANING_FRUIT once you finished the tasks. And  
   find the next high memory usage issue related low hanging fruit, and write the  
   todo tasks into LOW_HANGING_FRUIT.md
