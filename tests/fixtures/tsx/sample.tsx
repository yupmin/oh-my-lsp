function add(a: number, b: number): number {
  return a + b
}

export function App(): JSX.Element {
  const result = add(1, 2)
  return <div>{result}</div>
}
