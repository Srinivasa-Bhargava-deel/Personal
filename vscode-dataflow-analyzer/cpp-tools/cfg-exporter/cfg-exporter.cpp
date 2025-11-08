#include <clang/AST/ASTContext.h>
#include <clang/AST/RecursiveASTVisitor.h>
#include <clang/Basic/SourceManager.h>
#include <clang/Frontend/CompilerInstance.h>
#include <clang/Frontend/FrontendActions.h>
#include <clang/Tooling/Tooling.h>
#include <clang/Analysis/CFG.h>
#include <llvm/Support/CommandLine.h>
#include <llvm/Support/raw_ostream.h>
#include <nlohmann/json.hpp>
#include <memory>
#include <string>
#include <vector>
#include <fstream>

using namespace clang;
using namespace clang::tooling;
using json = nlohmann::json;

class CFGExporterVisitor : public RecursiveASTVisitor<CFGExporterVisitor> {
public:
  explicit CFGExporterVisitor(ASTContext &Context) : Context(Context) {}

  bool VisitFunctionDecl(FunctionDecl *Func) {
    if (!Func->hasBody()) {
      return true;
    }

    Stmt *Body = Func->getBody();
    auto &SM = Context.getSourceManager();

    // Skip functions not in main file
    if (!SM.isInMainFile(Func->getLocation())) {
      return true;
    }

    std::unique_ptr<CFG> cfg = CFG::buildCFG(Func, Body, &Context, CFG::BuildOptions());
    if (!cfg) {
      return true;
    }

    json funcJson;
    funcJson["name"] = Func->getNameInfo().getName().getAsString();

    SourceLocation Loc = Func->getBeginLoc();
    if (Loc.isValid()) {
      funcJson["range"]["start"]["line"] = SM.getSpellingLineNumber(Loc);
      funcJson["range"]["start"]["column"] = SM.getSpellingColumnNumber(Loc);
      funcJson["file"] = SM.getFilename(Loc).str();
    }

    json blocksJson = json::array();

    for (const CFGBlock *Block : *cfg) {
      json blockJson;
      blockJson["id"] = static_cast<int>(Block->getBlockID());
      bool isEntry = (Block == &cfg->getEntry());
      bool isExit = Block->succ_empty();
      blockJson["label"] = isEntry ? "Entry" : (isExit ? "Exit" : ("B" + std::to_string(Block->getBlockID())));
      blockJson["isEntry"] = isEntry;
      blockJson["isExit"] = isExit;

      json statementsJson = json::array();

      for (const auto &Element : *Block) {
        if (auto StmtElem = Element.getAs<CFGStmt>()) {
          const Stmt *S = StmtElem->getStmt();

          std::string stmtStr;
          llvm::raw_string_ostream stream(stmtStr);
          S->printPretty(stream, nullptr, Context.getPrintingPolicy());

          json stmtJson;
          stmtJson["text"] = stream.str();

          auto BeginLoc = S->getBeginLoc();
          auto EndLoc = S->getEndLoc();

          stmtJson["range"]["start"]["line"] = SM.getSpellingLineNumber(BeginLoc);
          stmtJson["range"]["start"]["column"] = SM.getSpellingColumnNumber(BeginLoc);
          stmtJson["range"]["end"]["line"] = SM.getSpellingLineNumber(EndLoc);
          stmtJson["range"]["end"]["column"] = SM.getSpellingColumnNumber(EndLoc);

          statementsJson.push_back(stmtJson);
        }
      }

      blockJson["statements"] = statementsJson;

      json succJson = json::array();
      for (auto SuccIt = Block->succ_begin(); SuccIt != Block->succ_end(); ++SuccIt) {
        if (const CFGBlock *Succ = *SuccIt) {
          succJson.push_back(static_cast<int>(Succ->getBlockID()));
        }
      }
      blockJson["successors"] = succJson;

      json predJson = json::array();
      for (auto PredIt = Block->pred_begin(); PredIt != Block->pred_end(); ++PredIt) {
        if (const CFGBlock *Pred = *PredIt) {
          predJson.push_back(static_cast<int>(Pred->getBlockID()));
        }
      }
      blockJson["predecessors"] = predJson;

      blocksJson.push_back(blockJson);
    }

    funcJson["blocks"] = blocksJson;
    functions.push_back(funcJson);

    return true;
  }

  json getFunctionsJson() const {
    json result;
    result["functions"] = functions;
    return result;
  }

private:
  ASTContext &Context;
  json functions = json::array();
};

class CFGExporterASTConsumer : public ASTConsumer {
public:
  explicit CFGExporterASTConsumer(ASTContext &Context) : Visitor(Context) {}

  void HandleTranslationUnit(ASTContext &Context) override {
    Visitor.TraverseDecl(Context.getTranslationUnitDecl());
    json output = Visitor.getFunctionsJson();
    llvm::outs() << output.dump(2) << "\n";
  }

private:
  CFGExporterVisitor Visitor;
};

class CFGExporterFrontendAction : public ASTFrontendAction {
public:
  std::unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance &CI, StringRef InFile) override {
    return std::make_unique<CFGExporterASTConsumer>(CI.getASTContext());
  }
};

static llvm::cl::OptionCategory CFGExporterCategory("cfg-exporter options");

int main(int argc, const char **argv) {
  // Use buildASTFromCodeWithArgs for better cross-platform compatibility
  // This approach doesn't require a compilation database and works universally
  
  if (argc < 2) {
    llvm::errs() << "Usage: cfg-exporter <source-file> [-- <compiler-args>]\n";
    return 1;
  }

  std::string SourceFile = argv[1];
  std::vector<std::string> CompilerArgs;
  
  // Default compiler arguments for C++ analysis
  // These work across Linux, macOS, and Windows
  CompilerArgs.push_back("-std=c++17");
  CompilerArgs.push_back("-fparse-all-comments");
  
  // Parse additional compiler arguments after "--"
  bool collectArgs = false;
  for (int i = 2; i < argc; ++i) {
    if (std::string(argv[i]) == "--") {
      collectArgs = true;
      continue;
    }
    if (collectArgs) {
      CompilerArgs.push_back(argv[i]);
    }
  }

  // Read the source file
  std::ifstream FileStream(SourceFile);
  if (!FileStream) {
    llvm::errs() << "Error: Could not open file " << SourceFile << "\n";
    return 1;
  }

  std::string Source((std::istreambuf_iterator<char>(FileStream)),
                     std::istreambuf_iterator<char>());
  FileStream.close();

  // Build AST from source code with explicit compiler arguments
  // This is platform-agnostic and doesn't rely on system PATH or SDK discovery
  auto AST = clang::tooling::buildASTFromCodeWithArgs(
    Source,
    CompilerArgs,
    SourceFile
  );

  if (!AST) {
    llvm::errs() << "Error: Failed to build AST\n";
    return 1;
  }

  // Process the AST
  CFGExporterVisitor Visitor(AST->getASTContext());
  Visitor.TraverseDecl(AST->getASTContext().getTranslationUnitDecl());
  
  json output;
  output["functions"] = Visitor.getFunctionsJson()["functions"];
  
  llvm::outs() << output.dump(2) << "\n";

  return 0;
}
