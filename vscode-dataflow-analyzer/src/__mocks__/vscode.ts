// Mock VS Code API for Jest tests
export const workspace = {
  workspaceFolders: undefined,
  getConfiguration: () => ({
    get: (key: string) => {
      if (key === 'dataflowAnalyzer.taintSensitivity') {
        return 'precise';
      }
      return undefined;
    },
  }),
};

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  createWebviewPanel: jest.fn(),
};

export const Uri = {
  file: (path: string) => ({ fsPath: path }),
  parse: (path: string) => ({ fsPath: path }),
};

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export const ExtensionContext = {
  subscriptions: [],
  workspaceState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
  },
};

