#include <stdio.h>

// Test file for LOGIC-1.1: MAX_ITERATIONS Safety Check
// Complex CFG with many blocks to test convergence

int complexFunction(int n) {
    int result = 0;
    
    if (n > 0) {
        result = 1;
    }
    if (n > 10) {
        result = 10;
    }
    if (n > 20) {
        result = 20;
    }
    if (n > 30) {
        result = 30;
    }
    if (n > 40) {
        result = 40;
    }
    
    return result;
}

int main() {
    int x = complexFunction(25);
    printf("%d\n", x);
    return 0;
}

