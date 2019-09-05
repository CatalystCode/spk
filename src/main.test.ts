import { sum } from "./main";

test("adds 1 + 2 to equal 3", () => {
  expect(sum(1, 2)).toBe(3);
});

test("this should fail", () => {
  expect(sum(1, 2)).toBe(3000);
});
