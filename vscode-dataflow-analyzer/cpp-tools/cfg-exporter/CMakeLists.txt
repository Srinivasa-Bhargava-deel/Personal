cmake_minimum_required(VERSION 3.13)
project(cfg_exporter)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Clang REQUIRED CONFIG)
find_package(LLVM REQUIRED CONFIG)

message(STATUS "Found LLVM ${LLVM_PACKAGE_VERSION}")
message(STATUS "Using LLVMConfig.cmake in: ${LLVM_DIR}")

include_directories(${LLVM_INCLUDE_DIRS})
add_definitions(${LLVM_DEFINITIONS})

include_directories(${CLANG_INCLUDE_DIRS})
add_definitions(${CLANG_DEFINITIONS})

set(SOURCE_FILES cfg-exporter.cpp)

add_executable(cfg-exporter ${SOURCE_FILES})

target_link_libraries(cfg-exporter
  PRIVATE
    clangTooling
    clangFrontend
    clangAST
    clangASTMatchers
    clangBasic
    clangLex
    clangRewriteFrontend
    clangSerialization
    ${LLVM_LIBS}
)

llvm_map_components_to_libnames(llvm_libs support)

install(TARGETS cfg-exporter DESTINATION bin)
