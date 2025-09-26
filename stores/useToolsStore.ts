import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultVectorStore } from "@/config/constants";

type File = {
  id: string;
  name: string;
  content: string;
};

type VectorStore = {
  id: string;
  name: string;
  files?: File[];
};

export type WebSearchConfig = {
  user_location?: {
    type: "approximate";
    country?: string;
    city?: string;
    region?: string;
  };
};

export type McpConfig = {
  server_label: string;
  server_url: string;
  allowed_tools: string;
  skip_approval: boolean;
};

export interface ToolsState {
  webSearchEnabled: boolean;
  fileSearchEnabled: boolean;
  functionsEnabled: boolean;
  codeInterpreterEnabled: boolean;
  vectorStore: VectorStore;
  webSearchConfig: WebSearchConfig;
  mcpEnabled: boolean;
  mcpConfig: McpConfig;
  googleIntegrationEnabled: boolean;
}

interface StoreState {
  fileSearchEnabled: boolean;
  setFileSearchEnabled: (enabled?: boolean) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (enabled: boolean) => void;
  functionsEnabled: boolean;
  setFunctionsEnabled: (enabled: boolean) => void;
  googleIntegrationEnabled: boolean;
  setGoogleIntegrationEnabled: (enabled: boolean) => void;
  codeInterpreterEnabled: boolean;
  setCodeInterpreterEnabled: (enabled: boolean) => void;
  vectorStore: VectorStore | null;
  setVectorStore: (store: VectorStore) => void;
  webSearchConfig: WebSearchConfig;
  setWebSearchConfig: (config: WebSearchConfig) => void;
  mcpEnabled: boolean;
  setMcpEnabled: (enabled: boolean) => void;
  mcpConfig: McpConfig;
  setMcpConfig: (config: McpConfig) => void;
}

const useToolsStore = create<StoreState>()(
  persist(
    (set) => ({
      vectorStore: defaultVectorStore.id !== "" ? defaultVectorStore : null,
      webSearchConfig: {
        user_location: {
          type: "approximate",
          country: "",
          city: "",
          region: "",
        },
      },
      mcpConfig: {
        server_label: "",
        server_url: "",
        allowed_tools: "",
        skip_approval: true,
      },
      fileSearchEnabled: true,
      setFileSearchEnabled: (enabled = true) => {
        set({ fileSearchEnabled: enabled });
      },
      webSearchEnabled: true,
      setWebSearchEnabled: (enabled) => {
        set({ webSearchEnabled: enabled });
      },
      functionsEnabled: false,
      setFunctionsEnabled: (enabled) => {
        set({ functionsEnabled: enabled });
      },
      googleIntegrationEnabled: false,
      setGoogleIntegrationEnabled: (enabled) => {
        set({ googleIntegrationEnabled: enabled });
      },
      mcpEnabled: false,
      setMcpEnabled: (enabled) => {
        set({ mcpEnabled: enabled });
      },
      codeInterpreterEnabled: false,
      setCodeInterpreterEnabled: (enabled) => {
        set({ codeInterpreterEnabled: enabled });
      },
      setVectorStore: (store) => set({ vectorStore: store }),
      setWebSearchConfig: (config) => set({ webSearchConfig: config }),
      setMcpConfig: (config) => set({ mcpConfig: config }),
    }),
    {
      name: "tools-store",
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<StoreState>) ?? {};
        const merged = { ...currentState, ...persisted } as StoreState;

        merged.vectorStore =
          defaultVectorStore.id !== "" ? defaultVectorStore : null;
        if (merged.fileSearchEnabled === undefined) {
          merged.fileSearchEnabled = true;
        }
        if (merged.webSearchEnabled === undefined) {
          merged.webSearchEnabled = true;
        }

        return merged;
      },
    }
  )
);

export default useToolsStore;
