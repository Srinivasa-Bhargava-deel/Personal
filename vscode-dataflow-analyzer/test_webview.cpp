// Test file to verify webview functionality
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int multiply(int x, int y) {
    int result = x * y;
    return result;
}

int main() {
    int num1, num2;
    scanf("%d %d", &num1, &num2);
    
    int sum = add(num1, num2);
    int product = multiply(num1, num2);
    
    printf("Sum: %d\n", sum);
    printf("Product: %d\n", product);
    
    return 0;
}

