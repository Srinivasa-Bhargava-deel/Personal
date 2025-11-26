// Test file for inter-procedural taint analysis
// This tests taint propagation across function boundaries

#include <cstdio>
#include <cstring>

// Taint source: user input
char* get_user_input() {
    char buffer[100];
    fgets(buffer, sizeof(buffer), stdin);
    return buffer;
}

// Function that processes tainted input
void process_input(char* input) {
    char local_buffer[100];
    strcpy(local_buffer, input);  // local_buffer becomes tainted
    printf("Processed: %s\n", local_buffer);
}

// Function that returns tainted data
char* duplicate_string(char* src) {
    char* result = (char*)malloc(100);
    strcpy(result, src);  // result is tainted
    return result;  // Return value is tainted
}

// Main function demonstrating inter-procedural taint flow
int main() {
    char* user_data = get_user_input();  // user_data is tainted
    
    // Test 1: Parameter taint mapping
    process_input(user_data);  // input parameter should be tainted
    
    // Test 2: Return value taint
    char* copied = duplicate_string(user_data);  // copied should be tainted
    
    // Test 3: Library function taint summary
    char buffer[100];
    strcpy(buffer, user_data);  // buffer should be tainted via library function
    
    printf("Result: %s\n", copied);
    free(copied);
    return 0;
}
