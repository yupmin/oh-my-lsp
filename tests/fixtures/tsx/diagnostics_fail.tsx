function add(a: number, b: number): number {
  return a + b
}

const result: number = add(1, "2")
export const App = () => <div>{result}</div>
