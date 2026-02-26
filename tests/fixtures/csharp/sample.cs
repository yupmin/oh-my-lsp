using System;

public class Program {
  static int Add(int a, int b) {
    return a + b;
  }

  public static void Main(string[] args) {
    int result = Add(1, 2);
    Console.WriteLine(result);
  }
}
