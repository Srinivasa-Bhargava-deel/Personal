// Example C++ file for testing the dataflow analyzer

#include <iostream>
using namespace std;

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    
    if (x > 0) {
        int z = x + y;
        printf("%d\n", z);
    } else {
        int w = x - y;
        printf("%d\n", w);
    }
    
    return 0;
}

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    int result = n * factorial(n - 1);
    return result;
}

void processArray(int arr[], int size) {
    int sum = 0;
    for (int i = 0; i < size; i++) {
        sum = sum + arr[i];
    }
    printf("Sum: %d\n", sum);
}

