/**
 * test_attack_paths.cpp - Attack Path Visualization Tests
 * 
 * Tests source-to-sink path visualization and attack path highlighting.
 * Validates: Complete attack paths, path highlighting, source/sink identification.
 * 
 * EXPECTED RESULTS:
 * - Complete attack paths should be identified from source to sink
 * - Paths should be highlighted in visualization
 * - Source, propagation, and sink blocks should be visually distinct
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// =============================================================================
// TEST 1: Simple Attack Path
// =============================================================================
// EXPECTED:
// - Attack path: scanf -> buffer -> printf
// - Path should be highlighted
// - Source block (scanf) should be marked
// - Sink block (printf) should be marked
void test_simple_attack_path() {
    char buffer[100];
    scanf("%s", buffer);  // SOURCE
    printf("%s\n", buffer);  // SINK - format string vulnerability
}

// =============================================================================
// TEST 2: Multi-Step Attack Path
// =============================================================================
// EXPECTED:
// - Attack path: scanf -> input -> process -> result -> printf
// - All intermediate blocks should be in path
// - Path should show complete flow
void process_input(char* input, char* output) {
    strcpy(output, input);  // Propagation step
}

void test_multi_step_path() {
    char input[100];
    char output[100];
    scanf("%s", input);  // SOURCE
    process_input(input, output);  // Propagation
    printf("%s\n", output);  // SINK
}

// =============================================================================
// TEST 3: SQL Injection Attack Path
// =============================================================================
// EXPECTED:
// - Attack path: scanf -> query -> sprintf -> sql_exec
// - Path should be highlighted as SQL injection
// - Vulnerability type should be identified
void sql_exec(char* query) {
    // Simulated SQL execution
    printf("Executing: %s\n", query);  // SINK - SQL injection
}

void test_sql_injection_path() {
    char user_input[100];
    char query[200];
    scanf("%s", user_input);  // SOURCE
    sprintf(query, "SELECT * FROM users WHERE name='%s'", user_input);  // Propagation
    sql_exec(query);  // SINK
}

// =============================================================================
// TEST 4: Buffer Overflow Attack Path
// =============================================================================
// EXPECTED:
// - Attack path: scanf -> large_input -> strcpy -> small_buffer
// - Path should be highlighted as buffer overflow
// - Vulnerability type should be identified
void test_buffer_overflow_path() {
    char large_input[200];
    char small_buffer[10];
    scanf("%s", large_input);  // SOURCE
    strcpy(small_buffer, large_input);  // SINK - buffer overflow
    printf("%s\n", small_buffer);
}

// =============================================================================
// TEST 5: Command Injection Attack Path
// =============================================================================
// EXPECTED:
// - Attack path: scanf -> command -> system
// - Path should be highlighted as command injection
// - Vulnerability type should be identified
void test_command_injection_path() {
    char command[100];
    scanf("%s", command);  // SOURCE
    system(command);  // SINK - command injection
}

// =============================================================================
// TEST 6: Path with Control Flow
// =============================================================================
// EXPECTED:
// - Attack path should follow control flow
// - Conditional branches should be included in path
// - Path should show all possible routes
void test_path_with_control_flow() {
    char input[100];
    char output[100];
    scanf("%s", input);  // SOURCE
    
    if (strlen(input) > 50) {
        strcpy(output, input);  // Path through if branch
    } else {
        strcpy(output, input);  // Path through else branch
    }
    
    printf("%s\n", output);  // SINK
}

// =============================================================================
// TEST 7: Inter-Procedural Attack Path
// =============================================================================
// EXPECTED:
// - Attack path should cross function boundaries
// - Path should show parameter passing
// - Path should show return value propagation
char* get_tainted_input() {
    static char buffer[100];
    scanf("%s", buffer);  // SOURCE
    return buffer;  // Return tainted value
}

void use_tainted_input(char* input) {
    printf("%s\n", input);  // SINK
}

void test_interprocedural_path() {
    char* tainted = get_tainted_input();  // Propagation
    use_tainted_input(tainted);  // SINK
}

int main() {
    test_simple_attack_path();
    test_multi_step_path();
    test_sql_injection_path();
    test_buffer_overflow_path();
    test_command_injection_path();
    test_path_with_control_flow();
    test_interprocedural_path();
    return 0;
}

