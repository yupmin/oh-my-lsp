defmodule Sample do
  def add(a, b) do
    a + b
  end
end

result = Sample.add(1, 2)
IO.puts(result)
