cmake_minimum_required(VERSION 3.13)
project(cfg_exporter)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Download nlohmann/json single header file
set(JSON_HEADER_DIR ${CMAKE_BINARY_DIR}/json_include)
set(JSON_HEADER_FILE ${JSON_HEADER_DIR}/nlohmann/json.hpp)

# Download the header file if it doesn't exist
if(NOT EXISTS ${JSON_HEADER_FILE})
  message(STATUS "JSON header not found, downloading...")
  message(STATUS "Target location: ${JSON_HEADER_FILE}")
  file(MAKE_DIRECTORY ${JSON_HEADER_DIR}/nlohmann)
  message(STATUS "Downloading nlohmann/json.hpp from GitHub...")
  
  # Try download with TLS verification first
  file(DOWNLOAD
    https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp
    ${JSON_HEADER_FILE}
    SHOW_PROGRESS
    STATUS DOWNLOAD_STATUS
    TLS_VERIFY ON
  )
  list(GET DOWNLOAD_STATUS 0 STATUS_CODE)
  list(GET DOWNLOAD_STATUS 1 STATUS_MESSAGE)
  
  # If TLS verification fails, try without (for Docker environments with cert issues)
  if(NOT STATUS_CODE EQUAL 0)
    message(WARNING "Download with TLS verification failed (${STATUS_CODE}), trying without TLS verification...")
    file(DOWNLOAD
      https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp
      ${JSON_HEADER_FILE}
      SHOW_PROGRESS
      STATUS DOWNLOAD_STATUS
      TLS_VERIFY OFF
    )
    list(GET DOWNLOAD_STATUS 0 STATUS_CODE)
    list(GET DOWNLOAD_STATUS 1 STATUS_MESSAGE)
  endif()
  
  if(NOT STATUS_CODE EQUAL 0)
    message(FATAL_ERROR "Failed to download nlohmann/json.hpp: ${STATUS_CODE} - ${STATUS_MESSAGE}")
  endif()
  
  message(STATUS "Successfully downloaded nlohmann/json.hpp")
else()
  message(STATUS "JSON header already exists: ${JSON_HEADER_FILE}")
endif()

# Verify the file exists
if(NOT EXISTS ${JSON_HEADER_FILE})
  message(FATAL_ERROR "JSON header file does not exist after download: ${JSON_HEADER_FILE}")
endif()

message(STATUS "JSON header directory: ${JSON_HEADER_DIR}")
message(STATUS "JSON header file: ${JSON_HEADER_FILE}")

# Create interface library for nlohmann_json
add_library(nlohmann_json INTERFACE)
target_include_directories(nlohmann_json INTERFACE ${JSON_HEADER_DIR})
add_library(nlohmann_json::nlohmann_json ALIAS nlohmann_json)

message(STATUS "nlohmann_json interface library created with include directory: ${JSON_HEADER_DIR}")

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
    nlohmann_json::nlohmann_json
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
