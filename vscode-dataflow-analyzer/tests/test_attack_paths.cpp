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
#include <cstdlib>

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

// =============================================================================
// COUNTEREXAMPLE 1: Attack Path Through Function Pointer
// =============================================================================
// COUNTEREXAMPLE: Attack path through function pointer call
// This tests if attack paths are detected through function pointers
// EXPECTED: Attack path should be detected through function pointer
// EDGE CASE: Function pointer attack path
typedef void (*SinkFunc)(char*);

void sink_a(char* data) {
    system(data);  // SINK - command injection
}

void sink_b(char* data) {
    char buffer[200];
    sprintf(buffer, "%s", data);  // SINK - format string
}

void test_counterexample_funcptr_attack_path() {
    char input[100];
    scanf("%s", input);  // SOURCE
    
    SinkFunc sink = sink_a;
    sink(input);  // Attack path through function pointer
}

// =============================================================================
// COUNTEREXAMPLE 2: Attack Path Through Global Variable
// =============================================================================
// COUNTEREXAMPLE: Attack path through global variable
// This tests if attack paths are detected through globals
// EXPECTED: Attack path should be detected through global variable
// EDGE CASE: Global variable attack path
char global_attack_buffer[100];

void set_global_attack(char* input) {
    strcpy(global_attack_buffer, input);  // Set global
}

void use_global_attack() {
    system(global_attack_buffer);  // SINK - use global
}

void test_counterexample_global_attack_path() {
    char input[100];
    scanf("%s", input);  // SOURCE
    
    set_global_attack(input);  // Set global with tainted data
    use_global_attack();  // Attack path through global
}

// =============================================================================
// COUNTEREXAMPLE 3: Attack Path Through Multiple Functions
// =============================================================================
// COUNTEREXAMPLE: Attack path through multiple function calls
// This tests if attack paths are detected through long call chains
// EXPECTED: Attack path should be detected through entire chain
// EDGE CASE: Long attack path chain

// Forward declarations
char* level2_attack(char* input);
char* level3_attack(char* input);

char* level1_attack(char* input) {
    return level2_attack(input);
}

char* level2_attack(char* input) {
    return level3_attack(input);
}

char* level3_attack(char* input) {
    char* result = (char*)malloc(100);
    strcpy(result, input);
    return result;
}

void test_counterexample_multi_func_attack_path() {
    char input[100];
    scanf("%s", input);  // SOURCE
    
    char* result = level1_attack(input);  // Multi-level attack path
    system(result);  // SINK
    free(result);
}

// =============================================================================
// COUNTEREXAMPLE 4: Attack Path Through Struct Field
// =============================================================================
// COUNTEREXAMPLE: Attack path through struct field
// This tests if attack paths are detected through struct fields
// EXPECTED: Attack path should be detected through struct field
// EDGE CASE: Struct field attack path
struct AttackData {
    char command[100];
};

void set_struct_attack(struct AttackData* data, char* input) {
    strcpy(data->command, input);  // Set struct field
}

void test_counterexample_struct_attack_path() {
    struct AttackData data;
    char input[100];
    scanf("%s", input);  // SOURCE
    
    set_struct_attack(&data, input);  // Set struct field with tainted data
    system(data.command);  // SINK - attack path through struct field
}

// =============================================================================
// COUNTEREXAMPLE 5: Attack Path Through Array Element
// =============================================================================
// COUNTEREXAMPLE: Attack path through array element
// This tests if attack paths are detected through array elements
// EXPECTED: Attack path should be detected through array element
// EDGE CASE: Array element attack path
void test_counterexample_array_attack_path() {
    char commands[10][100];
    int index;
    
    scanf("%d", &index);  // TAINT SOURCE
    scanf("%s", commands[index]);  // SOURCE - tainted index and value
    
    system(commands[index]);  // SINK - attack path through array element
}

int main() {
    char buffer[200];
    test_simple_attack_path();
    test_multi_step_path();
    test_sql_injection_path();
    test_buffer_overflow_path();
    test_command_injection_path();
    test_path_with_control_flow();
    test_interprocedural_path();
    
    // Counterexamples
    test_counterexample_funcptr_attack_path();
    test_counterexample_global_attack_path();
    test_counterexample_multi_func_attack_path();
    test_counterexample_struct_attack_path();
    test_counterexample_array_attack_path();
    
    return 0;
}

