#include <stdio.h>

// Test file for LOGIC-1.2: Taint Analysis RD Map
// This file tests that taint analysis receives RD info for all blocks

int main() {
    int x;
    scanf("%d", &x);  // Taint source - block 1
    
    int y = x;         // Taint propagation - block 2
    int z = y + 1;     // More propagation - block 3
    
    printf("%d", z);   // Taint sink - block 4 (should detect vulnerability)
    return 0;
}

