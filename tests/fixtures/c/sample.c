#include <stdio.h>

int add(int a, int b) {
  return a + b;
}

int main(void) {
  int result = add(1, 2);
  printf("%d\n", result);
  return 0;
}
